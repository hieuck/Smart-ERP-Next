const fs = require('node:fs');
const path = require('node:path');

const controllerPath = path.join(__dirname, 'warehouses.controller.ts');
const source = fs.readFileSync(controllerPath, 'utf8');

describe('WarehousesController swagger decorators', () => {
  it('has @ApiTags on the controller', () => {
    expect(source).toContain("@ApiTags('Warehouses')");
  });

  it('has @ApiOperation on each endpoint', () => {
    expect(source).toContain("@ApiOperation({ summary: 'Create warehouse' })");
    expect(source).toContain("@ApiOperation({ summary: 'List warehouses' })");
    expect(source).toContain("@ApiOperation({ summary: 'Get default warehouse' })");
    expect(source).toContain("@ApiOperation({ summary: 'Get warehouse by id' })");
    expect(source).toContain("@ApiOperation({ summary: 'Update warehouse' })");
    expect(source).toContain("@ApiOperation({ summary: 'Delete warehouse' })");
  });
});
