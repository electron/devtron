import { ArrowRight, HelpCircle } from 'lucide-react';
import type { Direction } from '../../../types/shared';

type Props = {
  direction: Direction;
};
export default function DirectionBadge({ direction }: Props) {
  const baseClass =
    'flex items-center overflow-hidden justify-center w-full px-2 py-0.5 rounded-sm text-xs font-medium border';
  const getBadgeConfig = (direction: Direction) => {
    switch (direction) {
      case 'renderer-to-main':
        return {
          colorClass:
            'dark:bg-dark-blue dark:text-light-blue bg-blue-100 text-blue-800 border-blue-300 dark:border-light-blue',
          Icon: ArrowRight,
          labelLeft: 'R',
          labelRight: 'Main',
          tooltip: 'Renderer to Main',
        };
      case 'main-to-renderer':
        return {
          colorClass:
            'dark:bg-dark-green dark:text-light-green bg-green-100 text-green-800 border-green-300 dark:border-light-green',
          Icon: ArrowRight,
          labelLeft: 'Main',
          labelRight: 'R',
          tooltip: 'Main to Renderer',
        };
      case 'service-worker-to-main':
        return {
          colorClass:
            'dark:bg-dark-yellow dark:text-light-yellow bg-yellow-100 text-yellow-800 border-yellow-300 dark:border-light-yellow',
          Icon: ArrowRight,
          labelLeft: 'SW',
          labelRight: 'Main',
          tooltip: 'Service Worker to Main',
        };
      case 'main-to-service-worker':
        return {
          colorClass:
            'dark:bg-dark-orange dark:text-light-orange bg-orange-100 text-orange-800 border-orange-300 dark:border-light-orange',
          Icon: ArrowRight,
          labelLeft: 'Main',
          labelRight: 'SW',
          tooltip: 'Main to Service Worker',
        };
      case 'renderer':
        return {
          colorClass:
            'dark:bg-dark-purple dark:text-light-purple bg-purple-100 text-purple-800 border-purple-300 dark:border-light-purple',
          labelLeft: 'Renderer',
          labelRight: '',
          tooltip: 'Renderer',
        };
      default:
        return {
          colorClass:
            'dark:bg-charcoal-500 dark:text-charcoal-100 bg-gray-100 text-gray-800 border-gray-400 dark:border-charcoal-200',
          Icon: HelpCircle,
          label: 'Unknown',
          tooltip: 'Unknown direction',
        };
    }
  };

  const { colorClass, Icon, labelLeft, labelRight, tooltip } = getBadgeConfig(direction);

  return (
    <span className={`${baseClass} ${colorClass}`} title={tooltip}>
      {labelLeft}
      {Icon && <Icon size={13} className="mx-0.5 flex-shrink-0" />}
      {labelRight}
    </span>
  );
}
