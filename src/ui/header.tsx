import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from './components';

export function PageHeader(props: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  onBack?: (() => void) | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {props.eyebrow ? <p className="text-xs uppercase tracking-[0.25em] text-app-muted">{props.eyebrow}</p> : null}
        <p className={props.eyebrow ? 'mt-1 text-sm font-semibold text-app-text' : 'text-sm font-semibold text-app-text'}>
          {props.title}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {props.right}
        {props.onBack ? (
          <IconButton onClick={props.onBack} title="Back">
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

