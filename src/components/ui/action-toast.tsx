import { Link } from 'react-router-dom';

export interface ActionToastLink {
  label: string;
  href: string;
}

interface ActionToastProps {
  description: string;
  links?: ActionToastLink[];
}

export function ActionToast({ description, links }: ActionToastProps) {
  return (
    <div className="space-y-2">
      <p>{description}</p>
      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link, i) => (
            <Link 
              key={i}
              to={link.href}
              className="text-primary underline text-sm hover:text-primary/80"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface MissingEmailToastProps {
  interpreters: Array<{ id: string; first_name: string; last_name: string }>;
}

export function MissingEmailToast({ interpreters }: MissingEmailToastProps) {
  return (
    <div className="space-y-2">
      <p>The following interpreters are missing email addresses:</p>
      <ul className="list-disc pl-4 space-y-1">
        {interpreters.map((interpreter) => (
          <li key={interpreter.id}>
            <Link 
              to={`/interpreters/${interpreter.id}`}
              className="text-primary underline hover:text-primary/80"
            >
              {interpreter.first_name} {interpreter.last_name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
