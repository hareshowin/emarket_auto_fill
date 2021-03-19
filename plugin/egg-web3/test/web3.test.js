'use strict';

const mock = require('egg-mock');

describe('test/web3.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      baseDir: 'apps/web3-test',
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .expect('hi, web3')
      .expect(200);
  });
});
