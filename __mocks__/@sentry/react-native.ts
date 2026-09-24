export const init = jest.fn();
export const captureException = jest.fn();
export const wrap = jest.fn((component) => component);
export const breadcrumbsIntegration = jest.fn((options) => ({
  name: 'Breadcrumbs',
  options,
}));
