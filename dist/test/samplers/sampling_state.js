'use strict';

var _chai = require('chai');

var _sampling_state = require('../../src/samplers/v2/sampling_state');

var _sampling_state2 = _interopRequireDefault(_sampling_state);

var _span_context = require('../../src/span_context');

var _span_context2 = _interopRequireDefault(_span_context);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

describe('SamplingState', function() {
  it('should support extendedState', function() {
    var s = new _sampling_state2.default();
    var es = s.extendedState();
    es['sithlord'] = { 'something, something': 'dark force' };
    _chai.assert.equal('dark force', s.extendedState()['sithlord']['something, something']);
  });
  it('should recognize local root span', function() {
    var s = new _sampling_state2.default('id123');
    _chai.assert.equal('id123', s.localRootSpanId());
    var ctx1 = _span_context2.default.withStringIds('', 'id123', null, 0);
    var ctx2 = _span_context2.default.withStringIds('', 'id12345', null, 0);
    _chai.assert.equal(true, s.isLocalRootSpan(ctx1));
    _chai.assert.equal(false, s.isLocalRootSpan(ctx2));
  });
  it('should support isLocal state', function() {
    var s = new _sampling_state2.default();
    _chai.assert.equal(false, s.isFinal());
    s.setFinal(true);
    _chai.assert.equal(true, s.isFinal());
    s.setFinal(false);
    _chai.assert.equal(false, s.isFinal());
  });
  it('should support firehose flag', function() {
    var s = new _sampling_state2.default();
    _chai.assert.equal(false, s.isFirehose());
    s.setFirehose(true);
    _chai.assert.equal(true, s.isFirehose());
    _chai.assert.equal(8, s.flags());
    s.setFirehose(false);
    _chai.assert.equal(false, s.isFirehose());
    _chai.assert.equal(0, s.flags());
  });
});
// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.
//# sourceMappingURL=sampling_state.js.map
