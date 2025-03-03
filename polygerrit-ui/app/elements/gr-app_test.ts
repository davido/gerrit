/**
 * @license
 * Copyright (C) 2016 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '../test/common-test-setup-karma';
import './gr-app';
import {getAppContext} from '../services/app-context';
import {html} from '@polymer/polymer/lib/utils/html-tag';
import {queryAndAssert, stubRestApi} from '../test/test-utils';
import {GrApp} from './gr-app';
import {
  createAppElementChangeViewParams,
  createAppElementSearchViewParams,
  createPreferences,
  createServerInfo,
} from '../test/test-data-generators';
import {GrAppElement} from './gr-app-element';
import {GrPluginHost} from './plugins/gr-plugin-host/gr-plugin-host';

const basicFixture = fixtureFromTemplate(html`<gr-app id="app"></gr-app>`);

suite('gr-app tests', () => {
  let grApp: GrApp;
  const config = createServerInfo();
  let appStartedStub: sinon.SinonStub;
  let routerStartStub: sinon.SinonStub;

  setup(async () => {
    appStartedStub = sinon.stub(getAppContext().reportingService, 'appStarted');
    stub('gr-account-dropdown', '_getTopContent');
    routerStartStub = stub('gr-router', 'start');
    stubRestApi('getAccount').returns(Promise.resolve(undefined));
    stubRestApi('getAccountCapabilities').returns(Promise.resolve({}));
    stubRestApi('getConfig').returns(Promise.resolve(config));
    stubRestApi('getPreferences').returns(Promise.resolve(createPreferences()));
    stubRestApi('getVersion').returns(Promise.resolve('42'));
    stubRestApi('probePath').returns(Promise.resolve(false));

    grApp = basicFixture.instantiate() as GrApp;
    await flush();
  });

  test('reporting', () => {
    assert.isTrue(appStartedStub.calledOnce);
  });

  test('reporting called before router start', () => {
    sinon.assert.callOrder(appStartedStub, routerStartStub);
  });

  test('passes config to gr-plugin-host', () => {
    const grAppElement = queryAndAssert<GrAppElement>(grApp, '#app-element');
    const pluginHost = queryAndAssert<GrPluginHost>(grAppElement, '#plugins');
    assert.deepEqual(pluginHost.config, config);
  });

  test('_paramsChanged sets search page', () => {
    const grAppElement = queryAndAssert<GrAppElement>(grApp, '#app-element');
    const paramsForChangeView = createAppElementChangeViewParams();
    const paramsForSearchView = createAppElementSearchViewParams();

    grAppElement._paramsChanged({
      base: paramsForChangeView,
      value: paramsForChangeView,
      path: '',
    });
    assert.notOk(grAppElement._lastSearchPage);

    grAppElement._paramsChanged({
      base: paramsForSearchView,
      value: paramsForSearchView,
      path: '',
    });
    assert.ok(grAppElement._lastSearchPage);
  });
});
