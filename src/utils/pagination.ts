type ReturnPagination = {
  totalPages: number;
  nextPage: boolean;
}

type ParamPagination = {
  page: number;
  countAll: number;
  limit: number;
}

interface IGetPagination {
  (param: ParamPagination): ReturnPagination
}

const getPagination: IGetPagination = ({ page, countAll, limit }) => {
  const totalPages = Math.ceil(countAll / limit);
  const nextPage = ((page + 1) * limit) < countAll;

  return { totalPages, nextPage }
}

export default getPagination;