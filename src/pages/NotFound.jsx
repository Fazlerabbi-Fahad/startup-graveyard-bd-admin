import { Link } from 'react-router';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="p-8">
      <EmptyState icon="alert" title="Page not found" action={<Link to="/" className="text-sm font-medium text-accent-text underline">Back to the dashboard</Link>}>
        The page you were looking for doesn't exist.
      </EmptyState>
    </div>
  );
}
