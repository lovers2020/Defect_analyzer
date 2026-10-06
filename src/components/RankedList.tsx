import { ArrowRight } from "lucide-react";

export function RankedList({ title, items, total, onViewRaw }: {
  title: string;
  items: { name: string; count: number }[];
  total: number;
  onViewRaw: () => void;
}) {
  return (
    <section className="design-panel ranking-panel">
      <h2 className="panel-title">{title}</h2>
      <div className="ranking-list">
        {items.slice(0, 10).map((item, index) => (
          <div className="ranking-row" key={item.name}>
            <span className="rank-number">{index + 1}</span>
            <span className="rank-label" title={item.name}>{item.name}</span>
            <div className="rank-track"><div style={{ width: `${total > 0 ? item.count / total * 100 : 0}%` }} /></div>
            <strong>{item.count.toLocaleString()}개</strong>
            <span className="rank-percent">{total > 0 ? Math.round(item.count / total * 100) : 0}%</span>
          </div>
        ))}
        {items.length === 0 && <p className="empty-message">검색 조건에 맞는 데이터가 없습니다.</p>}
      </div>
      <button type="button" className="text-action ranking-link" onClick={onViewRaw}>원본 데이터 보기 <ArrowRight size={16} /></button>
    </section>
  );
}
