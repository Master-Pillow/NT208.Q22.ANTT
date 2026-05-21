import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => (
  <div className="max-w-5xl mx-auto rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
    <Construction className="w-8 h-8 text-primary mb-4" />
    <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
    <p className="text-sm leading-6 text-slate-500">{description}</p>
  </div>
);
