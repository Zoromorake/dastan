# Collaboration Cloud Spec (`dastan-cloud`)

Implementation spec for the private `dastan-cloud` repository. Implements `@dastan/plugin-api` `CollaborationService`, `ShareService`, and `AuthService` using Supabase Postgres + Realtime + Edge Functions.

## Postgres schema

```sql
-- documents: cloud mirror of shared screenplay ids
create table public.documents (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- doc_snapshots: periodic Yjs binary state for resync on reconnect
create table public.doc_snapshots (
  document_id uuid primary key references public.documents (id) on delete cascade,
  ydoc_state bytea not null,
  saved_at timestamptz not null default now()
);

-- room_participants: ACL + presence backing
create type public.share_permission as enum ('view', 'comment', 'edit');

create table public.room_participants (
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  permission public.share_permission not null default 'edit',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index room_participants_user_id_idx on public.room_participants (user_id);

-- share_invites: pending email/link invites
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.share_invites (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  recipient_email text,
  permission public.share_permission not null default 'edit',
  status public.invite_status not null default 'pending',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index share_invites_document_id_idx on public.share_invites (document_id);
create index share_invites_token_idx on public.share_invites (token);

-- chat_messages: shared AI thread persistence (room-scoped)
create table public.chat_messages (
  id uuid primary key,
  room_id uuid not null references public.documents (id) on delete cascade,
  thread_id uuid not null,
  sender_user_id uuid references auth.users (id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_room_thread_idx on public.chat_messages (room_id, thread_id, created_at);
```

## Row Level Security

```sql
alter table public.documents enable row level security;
alter table public.doc_snapshots enable row level security;
alter table public.room_participants enable row level security;
alter table public.share_invites enable row level security;
alter table public.chat_messages enable row level security;

-- Helper: user has at least the required permission on a document
create or replace function public.user_document_permission(
  p_document_id uuid,
  p_user_id uuid
) returns public.share_permission
language sql stable security definer set search_path = public as $$
  select rp.permission
  from public.room_participants rp
  where rp.document_id = p_document_id
    and rp.user_id = p_user_id
  limit 1;
$$;

-- documents: owner or participant can read
create policy documents_select on public.documents for select using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.room_participants rp
    where rp.document_id = documents.id and rp.user_id = auth.uid()
  )
);

create policy documents_insert on public.documents for insert with check (owner_id = auth.uid());
create policy documents_update on public.documents for update using (owner_id = auth.uid());

-- doc_snapshots: participants with edit can write; all participants can read
create policy doc_snapshots_select on public.doc_snapshots for select using (
  public.user_document_permission(document_id, auth.uid()) is not null
);

create policy doc_snapshots_upsert on public.doc_snapshots for all using (
  public.user_document_permission(document_id, auth.uid()) = 'edit'
);

-- room_participants: owner manages; participants can read own row
create policy room_participants_select on public.room_participants for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.documents d
    where d.id = room_participants.document_id and d.owner_id = auth.uid()
  )
);

create policy room_participants_insert on public.room_participants for insert with check (
  exists (
    select 1 from public.documents d
    where d.id = document_id and d.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.share_invites si
    where si.document_id = room_participants.document_id
      and si.status = 'pending'
      and si.recipient_email = (select email from auth.users where id = auth.uid())
  )
);

-- chat_messages: participants can read; any participant can insert (AI uses service role for assistant rows)
create policy chat_messages_select on public.chat_messages for select using (
  public.user_document_permission(room_id, auth.uid()) is not null
);

create policy chat_messages_insert on public.chat_messages for insert with check (
  public.user_document_permission(room_id, auth.uid()) is not null
);
```

## Realtime channel design

| Channel | Pattern | Events |
|---------|---------|--------|
| Document room | `doc:{documentId}` | Broadcast: `yjs-update` (Uint8Array), `awareness-update`, `chat-message` |
| Presence | same channel | `{ userId, name, color, cursorBlockIndex }` |

### Authorization

Realtime channel names alone are **not** ACL. Flow:

1. Client calls `POST /functions/v1/join-room` with `{ documentId }` and session JWT.
2. Edge function verifies `room_participants` or valid `share_invites` token.
3. Returns a short-lived Realtime capability (or relies on RLS-backed private channel pattern).
4. Client subscribes only after successful join.

## `join-room` Edge Function (sketch)

```typescript
// dastan-cloud/collaboration/join-room/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { documentId } = await req.json();
  const { data: participant } = await supabase
    .from('room_participants')
    .select('permission')
    .eq('document_id', documentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participant) {
    return new Response('Forbidden', { status: 403 });
  }

  await supabase
    .from('room_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('document_id', documentId)
    .eq('user_id', user.id);

  // Load latest Yjs snapshot for initial sync
  const { data: snapshot } = await supabase
    .from('doc_snapshots')
    .select('ydoc_state')
    .eq('document_id', documentId)
    .maybeSingle();

  return Response.json({
    roomId: documentId,
    channel: `doc:${documentId}`,
    permission: participant.permission,
    initialState: snapshot?.ydoc_state ? Array.from(snapshot.ydoc_state) : null,
    presence: {
      userId: user.id,
      name: user.user_metadata?.display_name ?? user.email,
    },
  });
});
```

## `CollaborationService` implementation (sketch)

```typescript
// dastan-cloud/collaboration/supabase-collaboration-service.ts
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { CollaborationService, CollaborationRoom } from '@dastan/plugin-api';

export function createSupabaseCollaborationService(
  supabase: ReturnType<typeof createClient>,
): CollaborationService {
  const rooms = new Map<string, CollaborationRoom>();

  return {
    isAvailable: () => true,
    openRoom(documentId) {
      // Returns Supabase Realtime-backed room:
      // - connect(): subscribe to doc:{id}, relay yjs-update broadcast, apply incoming updates
      // - onPeersChange(): map channel presence state
      // - publishChatMessage(): broadcast chat-message event + insert chat_messages row
      // - Periodic: upsert doc_snapshots every 30s while connected
      return rooms.get(documentId) ?? createRoom(documentId);
    },
    closeRoom(documentId) {
      rooms.get(documentId)?.disconnect();
      rooms.delete(documentId);
    },
  };
}
```

### Yjs update relay

```typescript
function wireYjsChannel(ydoc: Y.Doc, channel: RealtimeChannel) {
  const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === 'remote') return;
    channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { update: Array.from(update) },
    });
  };

  ydoc.on('update', onLocalUpdate);

  channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
    Y.applyUpdate(ydoc, Uint8Array.from(payload.update), 'remote');
  });

  return () => ydoc.off('update', onLocalUpdate);
}
```

## Snapshot persistence

| Trigger | Action |
|---------|--------|
| Every 30s while ≥1 peer connected | `upsert doc_snapshots` with `Y.encodeStateAsUpdate(ydoc)` |
| Last peer disconnects | Final snapshot write |
| Client reconnect | `join-room` returns `initialState`; client applies before subscribing to diffs |

## Chat persistence + broadcast

1. User sends AI message → client persists to IndexedDB (offline-first) and `publishChatMessage`.
2. Cloud room inserts `chat_messages` row and broadcasts `chat-message` on `doc:{roomId}`.
3. Peers' `useCollaborationChatSync` merges incoming messages into `useChat` state.
4. Assistant response: `chat` edge function streams reply, then inserts assistant row + broadcast (service role).

## Registration in cloud bootstrap

```typescript
// dastan-cloud/bootstrap/registerCloudAdapters.ts
services.collaboration = createSupabaseCollaborationService(supabase);
services.share = createSupabaseShareService(supabase);
services.auth = createSupabaseAuthService(supabase);
services.entitlements = createBillingEntitlements(stripeCustomer);
```

## Environment variables

```bash
VITE_DASTAN_CLOUD_URL=https://cloud.dastan.example
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Client loads `@supabase/supabase-js` only when cloud URL is configured (dynamic import, same pattern as collaboration extensions).
