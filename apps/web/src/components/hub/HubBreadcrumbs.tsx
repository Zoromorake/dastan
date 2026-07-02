import { ChevronRight } from 'lucide-react';

export interface HubBreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface HubBreadcrumbsProps {
  items: HubBreadcrumbItem[];
}

export function HubBreadcrumbs({ items }: HubBreadcrumbsProps) {
  return (
    <nav aria-label="Library location" className="flex min-w-0 items-center gap-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
            {item.onClick && !isLast ? (
              <button
                className="truncate font-medium text-muted-foreground transition hover:text-foreground"
                type="button"
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ) : (
              <span className={`truncate ${isLast ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
