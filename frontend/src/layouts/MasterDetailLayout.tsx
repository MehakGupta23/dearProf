import { Outlet, useLocation } from 'react-router-dom';
import './MasterDetailLayout.css';

interface MasterDetailLayoutProps {
  list: React.ReactNode;
  basePath: string;
}

export function MasterDetailLayout({ list, basePath }: MasterDetailLayoutProps) {
  const location = useLocation();
  const isListOnly = location.pathname === basePath || location.pathname === `${basePath}/`;

  return (
    <div className={`master-detail ${isListOnly ? 'list-active' : 'detail-active'}`}>
      <div className="master-detail-list">{list}</div>
      <div className="master-detail-detail">
        <Outlet />
      </div>
    </div>
  );
}