const LOCAL_DEVICE_ID_KEY = 'dastan.local-device-id';
const LOCAL_ONLY_ACK_KEY = 'dastan.local-only-acknowledged';
const LOCAL_PASSCODE_HASH_KEY = 'dastan.local-passcode-hash';

function generateDeviceId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return `local-${crypto.randomUUID()}`;
	}

	return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getLocalDeviceId(): string {
	if (typeof window === 'undefined') {
		return 'local-server';
	}

	const existing = window.localStorage.getItem(LOCAL_DEVICE_ID_KEY)?.trim();

	if (existing) {
		return existing;
	}

	const nextId = generateDeviceId();
	window.localStorage.setItem(LOCAL_DEVICE_ID_KEY, nextId);
	return nextId;
}

export function hasAcknowledgedLocalOnlyMode(): boolean {
	if (typeof window === 'undefined') {
		return true;
	}

	return window.localStorage.getItem(LOCAL_ONLY_ACK_KEY) === 'true';
}

export function acknowledgeLocalOnlyMode(): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(LOCAL_ONLY_ACK_KEY, 'true');
}

async function hashPasscode(passcode: string): Promise<string> {
	const data = new TextEncoder().encode(passcode);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export async function setLocalPasscode(passcode: string): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	const trimmed = passcode.trim();

	if (!trimmed) {
		window.localStorage.removeItem(LOCAL_PASSCODE_HASH_KEY);
		return;
	}

	window.localStorage.setItem(LOCAL_PASSCODE_HASH_KEY, await hashPasscode(trimmed));
}

export function hasLocalPasscode(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	return Boolean(window.localStorage.getItem(LOCAL_PASSCODE_HASH_KEY));
}

export async function verifyLocalPasscode(passcode: string): Promise<boolean> {
	if (typeof window === 'undefined') {
		return true;
	}

	const stored = window.localStorage.getItem(LOCAL_PASSCODE_HASH_KEY);

	if (!stored) {
		return true;
	}

	return (await hashPasscode(passcode)) === stored;
}
