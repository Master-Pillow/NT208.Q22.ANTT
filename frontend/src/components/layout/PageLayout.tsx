import React, { useEffect } from 'react';

interface PageLayoutProps {
  title: string;
  breadcrumb?: string[];
  children: React.ReactNode;
}

export const PageLayout = ({ title, breadcrumb, children }: PageLayoutProps) => {
  useEffect(() => {
    document.title = `${title} | AdvisorHub`;
  }, [title]);

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-5 text-xs font-bold uppercase tracking-normal text-slate-400">
          {(breadcrumb || [title]).map((item, index, items) => (
            <React.Fragment key={`${item}-${index}`}>
              <span className={index === items.length - 1 ? 'text-primary' : undefined}>
                {item}
              </span>
              {index < items.length - 1 && <span className="mx-2 text-slate-300">/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
};
