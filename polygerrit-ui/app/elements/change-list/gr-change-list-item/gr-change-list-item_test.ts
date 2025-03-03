/**
 * @license
 * Copyright (C) 2015 The Android Open Source Project
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

import {fixture} from '@open-wc/testing-helpers';
import {html} from 'lit';
import {SubmitRequirementResultInfo} from '../../../api/rest-api';
import {getAppContext} from '../../../services/app-context';
import '../../../test/common-test-setup-karma';
import {
  createAccountWithId,
  createChange,
  createSubmitRequirementExpressionInfo,
  createSubmitRequirementResultInfo,
} from '../../../test/test-data-generators';
import {query, queryAndAssert, stubRestApi} from '../../../test/test-utils';
import {
  AccountId,
  BranchName,
  ChangeInfo,
  RepoName,
  TopicName,
} from '../../../types/common';
import {StandardLabels} from '../../../utils/label-util';
import {GerritNav} from '../../core/gr-navigation/gr-navigation';
import {columnNames} from '../gr-change-list/gr-change-list';
import './gr-change-list-item';
import {GrChangeListItem, LabelCategory} from './gr-change-list-item';

const basicFixture = fixtureFromElement('gr-change-list-item');

suite('gr-change-list-item tests', () => {
  const account = createAccountWithId();
  const change: ChangeInfo = {
    ...createChange(),
    internalHost: 'host',
    project: 'a/test/repo' as RepoName,
    topic: 'test-topic' as TopicName,
    branch: 'test-branch' as BranchName,
  };

  let element: GrChangeListItem;

  setup(async () => {
    stubRestApi('getLoggedIn').returns(Promise.resolve(false));
    element = basicFixture.instantiate();
    await element.updateComplete;
  });

  test('computeLabelCategory', () => {
    element.change = {
      ...change,
      labels: {},
    };
    assert.equal(
      element.computeLabelCategory('Verified'),
      LabelCategory.NOT_APPLICABLE
    );
    element.change.labels = {Verified: {approved: account, value: 1}};
    assert.equal(
      element.computeLabelCategory('Verified'),
      LabelCategory.APPROVED
    );
    element.change.labels = {Verified: {rejected: account, value: -1}};
    assert.equal(
      element.computeLabelCategory('Verified'),
      LabelCategory.REJECTED
    );
    element.change.labels = {'Code-Review': {approved: account, value: 1}};
    element.change.unresolved_comment_count = 1;
    assert.equal(
      element.computeLabelCategory('Code-Review'),
      LabelCategory.UNRESOLVED_COMMENTS
    );
    element.change.labels = {'Code-Review': {value: 1}};
    element.change.unresolved_comment_count = 0;
    assert.equal(
      element.computeLabelCategory('Code-Review'),
      LabelCategory.POSITIVE
    );
    element.change.labels = {'Code-Review': {value: -1}};
    assert.equal(
      element.computeLabelCategory('Code-Review'),
      LabelCategory.NEGATIVE
    );
    element.change.labels = {'Code-Review': {value: -1}};
    assert.equal(
      element.computeLabelCategory('Verified'),
      LabelCategory.NOT_APPLICABLE
    );
  });

  test('computeLabelClass', () => {
    element.change = {
      ...change,
      labels: {},
    };
    assert.equal(
      element.computeLabelClass('Verified'),
      'cell label u-gray-background'
    );
    element.change.labels = {Verified: {approved: account, value: 1}};
    assert.equal(element.computeLabelClass('Verified'), 'cell label u-green');
    element.change.labels = {Verified: {rejected: account, value: -1}};
    assert.equal(element.computeLabelClass('Verified'), 'cell label u-red');
    element.change.labels = {'Code-Review': {value: 1}};
    assert.equal(
      element.computeLabelClass('Code-Review'),
      'cell label u-green u-monospace'
    );
    element.change.labels = {'Code-Review': {value: -1}};
    assert.equal(
      element.computeLabelClass('Code-Review'),
      'cell label u-monospace u-red'
    );
    element.change.labels = {'Code-Review': {value: -1}};
    assert.equal(
      element.computeLabelClass('Verified'),
      'cell label u-gray-background'
    );
  });

  test('computeLabelTitle', () => {
    element.change = {
      ...change,
      labels: {},
    };
    assert.equal(element.computeLabelTitle('Verified'), 'Label not applicable');

    element.change.labels = {Verified: {approved: {name: 'Diffy'}}};
    assert.equal(element.computeLabelTitle('Verified'), 'Verified by Diffy');

    element.change.labels = {Verified: {approved: {name: 'Diffy'}}};
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      'Label not applicable'
    );

    element.change.labels = {Verified: {rejected: {name: 'Diffy'}}};
    assert.equal(element.computeLabelTitle('Verified'), 'Verified by Diffy');

    element.change.labels = {
      'Code-Review': {disliked: {name: 'Diffy'}, value: -1},
    };
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      'Code-Review by Diffy'
    );

    element.change.labels = {
      'Code-Review': {recommended: {name: 'Diffy'}, value: 1},
    };
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      'Code-Review by Diffy'
    );

    element.change.labels = {
      'Code-Review': {recommended: {name: 'Diffy'}, rejected: {name: 'Admin'}},
    };
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      'Code-Review by Admin'
    );

    element.change.labels = {
      'Code-Review': {approved: {name: 'Diffy'}, rejected: {name: 'Admin'}},
    };
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      'Code-Review by Admin'
    );

    element.change.labels = {
      'Code-Review': {
        recommended: {name: 'Diffy'},
        disliked: {name: 'Admin'},
        value: -1,
      },
    };
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      'Code-Review by Admin'
    );

    element.change.labels = {
      'Code-Review': {
        approved: {name: 'Diffy'},
        disliked: {name: 'Admin'},
        value: -1,
      },
    };
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      'Code-Review by Diffy'
    );

    element.change.labels = {'Code-Review': {approved: account, value: 1}};
    element.change.unresolved_comment_count = 1;
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      '1 unresolved comment'
    );

    element.change.labels = {
      'Code-Review': {approved: {name: 'Diffy'}, value: 1},
    };
    element.change.unresolved_comment_count = 1;
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      '1 unresolved comment,\nCode-Review by Diffy'
    );

    element.change.labels = {'Code-Review': {approved: account, value: 1}};
    element.change.unresolved_comment_count = 2;
    assert.equal(
      element.computeLabelTitle('Code-Review'),
      '2 unresolved comments'
    );
  });

  test('computeLabelIcon', () => {
    element.change = {
      ...change,
      labels: {},
    };
    assert.equal(element.computeLabelIcon('missingLabel'), '');
    element.change.labels = {Verified: {approved: account, value: 1}};
    assert.equal(element.computeLabelIcon('Verified'), 'gr-icons:check');
    element.change.labels = {'Code-Review': {approved: account, value: 1}};
    element.change.unresolved_comment_count = 1;
    assert.equal(element.computeLabelIcon('Code-Review'), 'gr-icons:comment');
  });

  test('computeLabelValue', () => {
    element.change = {
      ...change,
      labels: {},
    };
    assert.equal(element.computeLabelValue('Verified'), '');
    element.change.labels = {Verified: {approved: account, value: 1}};
    assert.equal(element.computeLabelValue('Verified'), '✓');
    element.change.labels = {Verified: {value: 1}};
    assert.equal(element.computeLabelValue('Verified'), '+1');
    element.change.labels = {Verified: {value: -1}};
    assert.equal(element.computeLabelValue('Verified'), '-1');
    element.change.labels = {Verified: {approved: account}};
    assert.equal(element.computeLabelValue('Verified'), '✓');
    element.change.labels = {Verified: {rejected: account}};
    assert.equal(element.computeLabelValue('Verified'), '✕');
  });

  test('no hidden columns', async () => {
    element.visibleChangeTableColumns = [
      'Subject',
      'Status',
      'Owner',
      'Reviewers',
      'Comments',
      'Repo',
      'Branch',
      'Updated',
      'Size',
      ' Status ',
    ];

    await element.updateComplete;

    for (const column of columnNames) {
      const elementClass = '.' + column.trim().toLowerCase();
      assert.isFalse(
        queryAndAssert(element, elementClass).hasAttribute('hidden')
      );
    }
  });

  test('repo column hidden', async () => {
    element.visibleChangeTableColumns = [
      'Subject',
      'Status',
      'Owner',
      'Reviewers',
      'Comments',
      'Branch',
      'Updated',
      'Size',
      ' Status ',
    ];

    await element.updateComplete;

    for (const column of columnNames) {
      const elementClass = '.' + column.trim().toLowerCase();
      if (column === 'Repo') {
        assert.isNotOk(query(element, elementClass));
      } else {
        assert.isOk(query(element, elementClass));
      }
    }
  });

  function checkComputeReviewers(
    userId: number | undefined,
    reviewerIds: number[],
    reviewerNames: (string | undefined)[],
    attSetIds: number[],
    expected: number[]
  ) {
    element.account = userId ? {_account_id: userId as AccountId} : null;
    element.change = {
      ...change,
      owner: {
        _account_id: 99 as AccountId,
      },
      reviewers: {
        REVIEWER: [],
      },
      attention_set: {},
    };
    for (let i = 0; i < reviewerIds.length; i++) {
      element.change!.reviewers.REVIEWER!.push({
        _account_id: reviewerIds[i] as AccountId,
        name: reviewerNames[i],
      });
    }
    attSetIds.forEach(id => (element.change!.attention_set![id] = {account}));

    const actual = element.computeReviewers().map(r => r._account_id);
    assert.deepEqual(actual, expected as AccountId[]);
  }

  test('compute reviewers', () => {
    checkComputeReviewers(undefined, [], [], [], []);
    checkComputeReviewers(1, [], [], [], []);
    checkComputeReviewers(1, [2], ['a'], [], [2]);
    checkComputeReviewers(1, [2, 3], [undefined, 'a'], [], [2, 3]);
    checkComputeReviewers(1, [2, 3], ['a', undefined], [], [3, 2]);
    checkComputeReviewers(1, [99], ['owner'], [], []);
    checkComputeReviewers(
      1,
      [2, 3, 4, 5],
      ['b', 'a', 'd', 'c'],
      [3, 4],
      [3, 4, 2, 5]
    );
    checkComputeReviewers(
      1,
      [2, 3, 1, 4, 5],
      ['b', 'a', 'x', 'd', 'c'],
      [3, 4],
      [1, 3, 4, 2, 5]
    );
  });

  test('random column does not exist', async () => {
    element.visibleChangeTableColumns = ['Bad'];

    await element.updateComplete;
    const elementClass = '.bad';
    assert.isNotOk(query(element, elementClass));
  });

  test('TShirt sizing tooltip', () => {
    element.change = {
      ...change,
      insertions: NaN,
      deletions: NaN,
    };
    assert.equal(element.computeSizeTooltip(), 'Size unknown');
    element.change = {
      ...change,
      insertions: 0,
      deletions: 0,
    };
    assert.equal(element.computeSizeTooltip(), 'Size unknown');
    element.change = {
      ...change,
      insertions: 1,
      deletions: 2,
    };
    assert.equal(element.computeSizeTooltip(), 'added 1, removed 2 lines');
  });

  test('TShirt sizing', () => {
    element.change = {
      ...change,
      insertions: NaN,
      deletions: NaN,
    };
    assert.equal(element.computeChangeSize(), null);

    element.change = {
      ...change,
      insertions: 1,
      deletions: 1,
    };
    assert.equal(element.computeChangeSize(), 'XS');

    element.change = {
      ...change,
      insertions: 9,
      deletions: 1,
    };
    assert.equal(element.computeChangeSize(), 'S');

    element.change = {
      ...change,
      insertions: 10,
      deletions: 200,
    };
    assert.equal(element.computeChangeSize(), 'M');

    element.change = {
      ...change,
      insertions: 99,
      deletions: 900,
    };
    assert.equal(element.computeChangeSize(), 'L');

    element.change = {
      ...change,
      insertions: 99,
      deletions: 999,
    };
    assert.equal(element.computeChangeSize(), 'XL');
  });

  test('change params passed to gr-navigation', async () => {
    const navStub = sinon.stub(GerritNav);
    element.change = change;
    await element.updateComplete;

    assert.deepEqual(navStub.getUrlForChange.lastCall.args, [change]);
    assert.deepEqual(navStub.getUrlForProjectChanges.lastCall.args, [
      change.project,
      true,
      change.internalHost,
    ]);
    assert.deepEqual(navStub.getUrlForBranch.lastCall.args, [
      change.branch,
      change.project,
      undefined,
      change.internalHost,
    ]);
    assert.deepEqual(navStub.getUrlForTopic.lastCall.args, [
      change.topic,
      change.internalHost,
    ]);
  });

  test('computeRepoDisplay', () => {
    element.change = {...change};
    assert.equal(element.computeRepoDisplay(), 'host/a/test/repo');
    assert.equal(element.computeTruncatedRepoDisplay(), 'host/…/test/repo');
    delete change.internalHost;
    element.change = {...change};
    assert.equal(element.computeRepoDisplay(), 'a/test/repo');
    assert.equal(element.computeTruncatedRepoDisplay(), '…/test/repo');
  });

  test('renders requirement with new submit requirements', async () => {
    sinon.stub(getAppContext().flagsService, 'isEnabled').returns(true);
    const submitRequirement: SubmitRequirementResultInfo = {
      ...createSubmitRequirementResultInfo(),
      name: StandardLabels.CODE_REVIEW,
      submittability_expression_result: {
        ...createSubmitRequirementExpressionInfo(),
        expression: 'label:Verified=MAX -label:Verified=MIN',
      },
    };
    const change: ChangeInfo = {
      ...createChange(),
      submit_requirements: [submitRequirement],
      unresolved_comment_count: 1,
    };
    const element = await fixture<GrChangeListItem>(
      html`<gr-change-list-item
        .change=${change}
        .labelNames=${[StandardLabels.CODE_REVIEW]}
      ></gr-change-list-item>`
    );

    const requirement = queryAndAssert(element, '.requirement');
    expect(requirement).dom.to.equal(`<iron-icon
        class="check-circle-filled" 
        icon="gr-icons:check-circle-filled">
      </iron-icon>`);
  });
});
