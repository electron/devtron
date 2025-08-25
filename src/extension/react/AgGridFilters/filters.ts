import type { DoesFilterPassParams } from 'ag-grid-community';
import type { Direction } from '../../../types/shared';

export const directionDoesFilterPass = ({
  model,
  node,
  handlerParams,
}: DoesFilterPassParams<any, any, Direction[]>) => {
  if (!model || model.length === 0) return true;

  const value: Direction | null | undefined = handlerParams.getValue(node);
  if (!value) return false;
  else return model.includes(value);
};
