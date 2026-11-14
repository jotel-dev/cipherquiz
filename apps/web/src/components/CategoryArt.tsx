import { Brain, Globe2, Landmark, Sigma } from 'lucide-react';
import type { Category } from '@cipherquiz/shared';

export const CATEGORY_ICONS = {
  Mathematics: Sigma,
  Geography: Globe2,
  History: Landmark,
  'General Knowledge': Brain,
};
export const CATEGORY_CLASS = {
  Mathematics: 'math',
  Geography: 'geography',
  History: 'history',
  'General Knowledge': 'knowledge',
};
export function CategoryArt({ category }: { category: Category }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <div
      className={`category-art ${CATEGORY_CLASS[category]}`}
      aria-hidden="true"
    >
      <div className="art-circle circle-one" />
      <div className="art-circle circle-two" />
      <Icon strokeWidth={1.25} />
      <span className="art-cross cross-one">+</span>
      <span className="art-cross cross-two">+</span>
      <span className="art-caption">
        CQ /{' '}
        {category === 'General Knowledge'
          ? 'GK'
          : category.slice(0, 3).toUpperCase()}
      </span>
    </div>
  );
}
