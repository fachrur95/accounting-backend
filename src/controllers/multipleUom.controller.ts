import pick from '../utils/pick';
import catchAsync from '../utils/catchAsync';
import { multipleUomService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const getMultipleUoms = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['code', 'name', 'unitId', 'itemId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await multipleUomService.queryMultipleUoms(filter, options, conditions, multipleSort);
  res.send(result);
});

export default {
  getMultipleUoms,
};
