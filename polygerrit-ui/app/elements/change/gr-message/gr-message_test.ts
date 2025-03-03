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

import '../../../test/common-test-setup-karma';
import './gr-message';
import {GerritNav} from '../../core/gr-navigation/gr-navigation';
import {
  createAccountWithIdNameAndEmail,
  createChange,
  createChangeMessage,
  createComment,
  createRevisions,
} from '../../../test/test-data-generators';
import {
  mockPromise,
  query,
  queryAll,
  queryAndAssert,
  stubRestApi,
} from '../../../test/test-utils';
import {GrMessage} from './gr-message';
import {
  AccountId,
  BasePatchSetNum,
  ChangeMessageId,
  EmailAddress,
  NumericChangeId,
  PatchSetNum,
  ReviewInputTag,
  Timestamp,
  UrlEncodedCommentId,
} from '../../../types/common';
import {tap} from '@polymer/iron-test-helpers/mock-interactions';
import {
  ChangeMessageDeletedEventDetail,
  ReplyEventDetail,
} from '../../../types/events';
import {GrButton} from '../../shared/gr-button/gr-button';
import {CommentSide} from '../../../constants/constants';
import {SinonStubbedMember} from 'sinon';

const basicFixture = fixtureFromElement('gr-message');

suite('gr-message tests', () => {
  let element: GrMessage;

  suite('when admin and logged in', () => {
    setup(async () => {
      stubRestApi('getIsAdmin').returns(Promise.resolve(true));
      element = basicFixture.instantiate();
      await flush();
    });

    test('reply event', async () => {
      element.message = {
        ...createChangeMessage(),
        id: '47c43261_55aa2c41' as ChangeMessageId,
        author: {
          _account_id: 1115495 as AccountId,
          name: 'Andrew Bonventre',
          email: 'andybons@chromium.org' as EmailAddress,
        },
        date: '2016-01-12 20:24:49.448000000' as Timestamp,
        message: 'Uploaded patch set 1.',
        _revision_number: 1 as PatchSetNum,
        expanded: true,
      };

      const promise = mockPromise();
      element.addEventListener('reply', (e: CustomEvent<ReplyEventDetail>) => {
        assert.deepEqual(e.detail.message, element.message);
        promise.resolve();
      });
      await flush();
      assert.isFalse(
        queryAndAssert<HTMLElement>(element, '.replyActionContainer').hidden
      );
      tap(queryAndAssert(element, '.replyBtn'));
      await promise;
    });

    test('can see delete button', async () => {
      element.message = {
        ...createChangeMessage(),
        id: '47c43261_55aa2c41' as ChangeMessageId,
        author: {
          _account_id: 1115495 as AccountId,
          name: 'Andrew Bonventre',
          email: 'andybons@chromium.org' as EmailAddress,
        },
        date: '2016-01-12 20:24:49.448000000' as Timestamp,
        message: 'Uploaded patch set 1.',
        _revision_number: 1 as PatchSetNum,
        expanded: true,
      };

      await flush();
      assert.isFalse(queryAndAssert<HTMLElement>(element, '.deleteBtn').hidden);
    });

    test('delete change message', async () => {
      element.changeNum = 314159 as NumericChangeId;
      element.message = {
        ...createChangeMessage(),
        id: '47c43261_55aa2c41' as ChangeMessageId,
        author: {
          _account_id: 1115495 as AccountId,
          name: 'Andrew Bonventre',
          email: 'andybons@chromium.org' as EmailAddress,
        },
        date: '2016-01-12 20:24:49.448000000' as Timestamp,
        message: 'Uploaded patch set 1.',
        _revision_number: 1 as PatchSetNum,
        expanded: true,
      };

      const promise = mockPromise();
      element.addEventListener(
        'change-message-deleted',
        (e: CustomEvent<ChangeMessageDeletedEventDetail>) => {
          assert.deepEqual(e.detail.message, element.message);
          assert.isFalse(
            (queryAndAssert(element, '.deleteBtn') as GrButton).disabled
          );
          promise.resolve();
        }
      );
      await flush();
      tap(queryAndAssert(element, '.deleteBtn'));
      assert.isTrue(
        (queryAndAssert(element, '.deleteBtn') as GrButton).disabled
      );
      await promise;
    });

    test('autogenerated prefix hiding', () => {
      element.message = {
        ...createChangeMessage(),
        tag: 'autogenerated:gerrit:test' as ReviewInputTag,
        expanded: false,
      };

      assert.isTrue(element.isAutomated);
      assert.isFalse(element.hidden);

      element.hideAutomated = true;

      assert.isTrue(element.hidden);
    });

    test('reviewer message treated as autogenerated', () => {
      element.message = {
        ...createChangeMessage(),
        tag: 'autogenerated:gerrit:test' as ReviewInputTag,
        reviewer: {},
        expanded: false,
      };

      assert.isTrue(element.isAutomated);
      assert.isFalse(element.hidden);

      element.hideAutomated = true;

      assert.isTrue(element.hidden);
    });

    test('batch reviewer message treated as autogenerated', () => {
      element.message = {
        ...createChangeMessage(),
        type: 'REVIEWER_UPDATE',
        reviewer: {},
        expanded: false,
      };

      assert.isTrue(element.isAutomated);
      assert.isFalse(element.hidden);

      element.hideAutomated = true;

      assert.isTrue(element.hidden);
    });

    test('tag that is not autogenerated prefix does not hide', () => {
      element.message = {
        ...createChangeMessage(),
        tag: 'something' as ReviewInputTag,
        expanded: false,
      };

      assert.isFalse(element.isAutomated);
      assert.isFalse(element.hidden);

      element.hideAutomated = true;

      assert.isFalse(element.hidden);
    });

    test('reply button hidden unless logged in', () => {
      const message = {
        ...createChangeMessage(),
        message: 'Uploaded patch set 1.',
        expanded: false,
      };
      assert.isFalse(element._computeShowReplyButton(message, false));
      assert.isTrue(element._computeShowReplyButton(message, true));
    });

    test('_computeShowOnBehalfOf', () => {
      const message = {
        ...createChangeMessage(),
        message: '...',
        expanded: false,
      };
      assert.isNotOk(element._computeShowOnBehalfOf(message));
      message.author = {_account_id: 1115495 as AccountId};
      assert.isNotOk(element._computeShowOnBehalfOf(message));
      message.real_author = {_account_id: 1115495 as AccountId};
      assert.isNotOk(element._computeShowOnBehalfOf(message));
      message.real_author._account_id = 123456 as AccountId;
      assert.isOk(element._computeShowOnBehalfOf(message));
      message.updated_by = message.author;
      delete message.author;
      assert.isOk(element._computeShowOnBehalfOf(message));
      delete message.updated_by;
      assert.isNotOk(element._computeShowOnBehalfOf(message));
    });

    test('clicking on date link fires event', () => {
      element.message = {
        ...createChangeMessage(),
        type: 'REVIEWER_UPDATE',
        reviewer: {},
        id: '47c43261_55aa2c41' as ChangeMessageId,
        expanded: false,
      };
      flush();
      const stub = sinon.stub();
      element.addEventListener('message-anchor-tap', stub);
      const dateEl = queryAndAssert(element, '.date');
      assert.ok(dateEl);
      tap(dateEl);

      assert.isTrue(stub.called);
      assert.deepEqual(stub.lastCall.args[0].detail, {id: element.message.id});
    });

    suite('uploaded patchset X message navigates to X - 1 vs  X', () => {
      let navStub: SinonStubbedMember<typeof GerritNav.navigateToChange>;
      setup(() => {
        element.change = {...createChange(), revisions: createRevisions(4)};
        navStub = sinon.stub(GerritNav, 'navigateToChange');
      });

      test('Patchset 1 navigates to Base', () => {
        element.message = {
          ...createChangeMessage(),
          message: 'Uploaded patch set 1.',
        };
        element._handleViewPatchsetDiff(new MouseEvent('click'));
        assert.isTrue(
          navStub.calledWithExactly(element.change!, {
            patchNum: 1 as PatchSetNum,
            basePatchNum: 'PARENT' as BasePatchSetNum,
          })
        );
      });

      test('Patchset X navigates to X vs X - 1', () => {
        element.message = {
          ...createChangeMessage(),
          message: 'Uploaded patch set 2.',
        };
        element._handleViewPatchsetDiff(new MouseEvent('click'));
        assert.isTrue(
          navStub.calledWithExactly(element.change!, {
            patchNum: 2 as PatchSetNum,
            basePatchNum: 1 as BasePatchSetNum,
          })
        );

        element.message = {
          ...createChangeMessage(),
          message: 'Uploaded patch set 200.',
        };
        element._handleViewPatchsetDiff(new MouseEvent('click'));
        assert.isTrue(
          navStub.calledWithExactly(element.change!, {
            patchNum: 200 as PatchSetNum,
            basePatchNum: 199 as BasePatchSetNum,
          })
        );
      });

      test('Commit message updated', () => {
        element.message = {
          ...createChangeMessage(),
          message: 'Commit message updated.',
        };
        element._handleViewPatchsetDiff(new MouseEvent('click'));
        assert.isTrue(
          navStub.calledWithExactly(element.change!, {
            patchNum: 4 as PatchSetNum,
            basePatchNum: 3 as BasePatchSetNum,
          })
        );
      });

      test('Merged patchset change message', () => {
        element.message = {
          ...createChangeMessage(),
          message: 'abcd↵3 is the latest approved patch-set.↵abc',
        };
        element._handleViewPatchsetDiff(new MouseEvent('click'));
        assert.isTrue(
          navStub.calledWithExactly(element.change!, {
            patchNum: 4 as PatchSetNum,
            basePatchNum: 3 as BasePatchSetNum,
          })
        );
      });
    });

    suite('compute messages', () => {
      test('empty', () => {
        assert.equal(
          element._computeMessageContent(
            true,
            '',
            undefined,
            '' as ReviewInputTag
          ),
          ''
        );
        assert.equal(
          element._computeMessageContent(
            false,
            '',
            undefined,
            '' as ReviewInputTag
          ),
          ''
        );
      });

      test('new patchset', () => {
        const original = 'Uploaded patch set 1.';
        const tag = 'autogenerated:gerrit:newPatchSet' as ReviewInputTag;
        let actual = element._computeMessageContent(true, original, [], tag);
        assert.equal(
          actual,
          element._computeMessageContentCollapsed(original, [], tag, [])
        );
        assert.equal(actual, original);
        actual = element._computeMessageContent(false, original, [], tag);
        assert.equal(actual, original);
      });

      test('new patchset rebased', () => {
        const original = 'Patch Set 27: Patch Set 26 was rebased';
        const tag = 'autogenerated:gerrit:newPatchSet' as ReviewInputTag;
        const expected = 'Patch Set 26 was rebased';
        let actual = element._computeMessageContent(true, original, [], tag);
        assert.equal(actual, expected);
        assert.equal(
          actual,
          element._computeMessageContentCollapsed(original, [], tag, [])
        );
        actual = element._computeMessageContent(false, original, [], tag);
        assert.equal(actual, expected);
      });

      test('ready for review', () => {
        const original = 'Patch Set 1:\n\nThis change is ready for review.';
        const tag = undefined;
        const expected = 'This change is ready for review.';
        let actual = element._computeMessageContent(true, original, [], tag);
        assert.equal(actual, expected);
        assert.equal(
          actual,
          element._computeMessageContentCollapsed(original, [], tag, [])
        );
        actual = element._computeMessageContent(false, original, [], tag);
        assert.equal(actual, expected);
      });
      test('new patchset with vote', () => {
        const original = 'Uploaded patch set 2: Code-Review+1';
        const tag = 'autogenerated:gerrit:newPatchSet' as ReviewInputTag;
        const expected = 'Uploaded patch set 2: Code-Review+1';
        let actual = element._computeMessageContent(true, original, [], tag);
        assert.equal(actual, expected);
        actual = element._computeMessageContent(false, original, [], tag);
        assert.equal(actual, expected);
      });
      test('vote', () => {
        const original = 'Patch Set 1: Code-Style+1';
        const tag = undefined;
        const expected = '';
        let actual = element._computeMessageContent(true, original, [], tag);
        assert.equal(actual, expected);
        actual = element._computeMessageContent(false, original, [], tag);
        assert.equal(actual, expected);
      });

      test('comments', () => {
        const original = 'Patch Set 1:\n\n(3 comments)';
        const tag = undefined;
        const expected = '';
        let actual = element._computeMessageContent(true, original, [], tag);
        assert.equal(actual, expected);
        actual = element._computeMessageContent(false, original, [], tag);
        assert.equal(actual, expected);
      });

      test('message template', () => {
        const original =
          'Removed vote: \n\n * Code-Style+1 by <GERRIT_ACCOUNT_0000001>\n * Code-Style-1 by <GERRIT_ACCOUNT_0000002>';
        const tag = undefined;
        const expected =
          'Removed vote: \n\n * Code-Style+1 by User-1\n * Code-Style-1 by User-2';
        const accountsInMessage = [
          createAccountWithIdNameAndEmail(1),
          createAccountWithIdNameAndEmail(2),
        ];
        let actual = element._computeMessageContent(
          true,
          original,
          accountsInMessage,
          tag
        );
        assert.equal(actual, expected);
        actual = element._computeMessageContent(
          false,
          original,
          accountsInMessage,
          tag
        );
        assert.equal(actual, expected);
      });

      test('message template missing accounts', () => {
        const original =
          'Removed vote: \n\n * Code-Style+1 by <GERRIT_ACCOUNT_0000001>\n * Code-Style-1 by <GERRIT_ACCOUNT_0000002>';
        const tag = undefined;
        const expected =
          'Removed vote: \n\n * Code-Style+1 by Gerrit Account 1\n * Code-Style-1 by Gerrit Account 2';
        let actual = element._computeMessageContent(true, original, [], tag);
        assert.equal(actual, expected);
        actual = element._computeMessageContent(false, original, [], tag);
        assert.equal(actual, expected);
      });
    });

    test('votes', () => {
      element.message = {
        ...createChangeMessage(),
        author: {},
        expanded: false,
        message: 'Patch Set 1: Verified+1 Code-Review-2 Trybot-Label3+1 Blub+1',
      };
      element.labelExtremes = {
        Verified: {max: 1, min: -1},
        'Code-Review': {max: 2, min: -2},
        'Trybot-Label3': {max: 3, min: 0},
      };
      flush();
      const scoreChips = queryAll(element, '.score');
      assert.equal(scoreChips.length, 3);

      assert.isTrue(scoreChips[0].classList.contains('positive'));
      assert.isTrue(scoreChips[0].classList.contains('max'));

      assert.isTrue(scoreChips[1].classList.contains('negative'));
      assert.isTrue(scoreChips[1].classList.contains('min'));

      assert.isTrue(scoreChips[2].classList.contains('positive'));
      assert.isFalse(scoreChips[2].classList.contains('min'));
    });

    test('Uploaded patch set X', () => {
      element.message = {
        ...createChangeMessage(),
        author: {},
        expanded: false,
        message:
          'Uploaded patch set 1:' +
          'Verified+1 Code-Review-2 Trybot-Label3+1 Blub+1',
      };
      element.labelExtremes = {
        Verified: {max: 1, min: -1},
        'Code-Review': {max: 2, min: -2},
        'Trybot-Label3': {max: 3, min: 0},
      };
      flush();
      const scoreChips = queryAll(element, '.score');
      assert.equal(scoreChips.length, 3);

      assert.isTrue(scoreChips[0].classList.contains('positive'));
      assert.isTrue(scoreChips[0].classList.contains('max'));

      assert.isTrue(scoreChips[1].classList.contains('negative'));
      assert.isTrue(scoreChips[1].classList.contains('min'));

      assert.isTrue(scoreChips[2].classList.contains('positive'));
      assert.isFalse(scoreChips[2].classList.contains('min'));
    });

    test('Uploaded and rebased', () => {
      element.message = {
        ...createChangeMessage(),
        author: {},
        expanded: false,
        message:
          'Uploaded patch set 4: Commit-Queue+1: Patch Set 3 was rebased.',
      };
      element.labelExtremes = {
        'Commit-Queue': {max: 2, min: -2},
      };
      flush();
      const scoreChips = queryAll(element, '.score');
      assert.equal(scoreChips.length, 1);
      assert.isTrue(scoreChips[0].classList.contains('positive'));
    });

    test('removed votes', () => {
      element.message = {
        ...createChangeMessage(),
        author: {},
        expanded: false,
        message: 'Patch Set 1: Verified+1 -Code-Review -Commit-Queue',
      };
      element.labelExtremes = {
        Verified: {max: 1, min: -1},
        'Code-Review': {max: 2, min: -2},
        'Commit-Queue': {max: 3, min: 0},
      };
      flush();
      const scoreChips = queryAll(element, '.score');
      assert.equal(scoreChips.length, 3);

      assert.isTrue(scoreChips[1].classList.contains('removed'));
      assert.isTrue(scoreChips[2].classList.contains('removed'));
    });

    test('false negative vote', () => {
      element.message = {
        ...createChangeMessage(),
        author: {},
        expanded: false,
        message: 'Patch Set 1: Cherry Picked from branch stable-2.14.',
      };
      element.labelExtremes = {};
      const scoreChips = element.root!.querySelectorAll('.score');
      assert.equal(scoreChips.length, 0);
    });
  });

  suite('when not logged in', () => {
    setup(async () => {
      stubRestApi('getLoggedIn').returns(Promise.resolve(false));
      stubRestApi('getIsAdmin').returns(Promise.resolve(false));
      element = basicFixture.instantiate();
      await flush();
    });

    test('reply and delete button should be hidden', () => {
      element.message = {
        ...createChangeMessage(),
        id: '47c43261_55aa2c41' as ChangeMessageId,
        author: {
          _account_id: 1115495 as AccountId,
          name: 'Andrew Bonventre',
          email: 'andybons@chromium.org' as EmailAddress,
        },
        date: '2016-01-12 20:24:49.448000000' as Timestamp,
        message: 'Uploaded patch set 1.',
        _revision_number: 1 as PatchSetNum,
        expanded: true,
      };

      flush();
      assert.isTrue(
        queryAndAssert<HTMLElement>(element, '.replyActionContainer').hidden
      );
      assert.isTrue(queryAndAssert<HTMLElement>(element, '.deleteBtn').hidden);
    });
  });

  suite('patchset comment summary', () => {
    setup(() => {
      element = basicFixture.instantiate();
      element.message = {
        ...createChangeMessage(),
        id: '6a07f64a82f96e7337ca5f7f84cfc73abf8ac2a3' as ChangeMessageId,
      };
    });

    test('single patchset comment posted', () => {
      const threads = [
        {
          comments: [
            {
              ...createComment(),
              change_message_id:
                '6a07f64a82f96e7337ca5f7f84cfc73abf8ac2a3' as ChangeMessageId,
              patch_set: 1 as PatchSetNum,
              id: 'e365b138_bed65caa' as UrlEncodedCommentId,
              updated: '2020-05-15 13:35:56.000000000' as Timestamp,
              message: 'testing the load',
              unresolved: false,
              path: '/PATCHSET_LEVEL',
              collapsed: false,
            },
          ],
          patchNum: 1 as PatchSetNum,
          path: '/PATCHSET_LEVEL',
          rootId: 'e365b138_bed65caa' as UrlEncodedCommentId,
          commentSide: CommentSide.REVISION,
        },
      ];
      assert.equal(
        element._computeMessageContentCollapsed(
          '',
          undefined,
          undefined,
          threads
        ),
        'testing the load'
      );
      assert.equal(
        element._computeMessageContent(false, '', undefined, undefined),
        ''
      );
    });

    test('single patchset comment with reply', () => {
      const threads = [
        {
          comments: [
            {
              ...createComment(),
              patch_set: 1 as PatchSetNum,
              id: 'e365b138_bed65caa' as UrlEncodedCommentId,
              updated: '2020-05-15 13:35:56.000000000' as Timestamp,
              message: 'testing the load',
              unresolved: false,
              path: '/PATCHSET_LEVEL',
              collapsed: false,
            },
            {
              change_message_id: '6a07f64a82f96e7337ca5f7f84cfc73abf8ac2a3',
              patch_set: 1 as PatchSetNum,
              id: 'd6efcc85_4cbbb6f4' as UrlEncodedCommentId,
              in_reply_to: 'e365b138_bed65caa' as UrlEncodedCommentId,
              updated: '2020-05-15 16:55:28.000000000' as Timestamp,
              message: 'n',
              unresolved: false,
              path: '/PATCHSET_LEVEL',
              __draft: true,
              collapsed: true,
            },
          ],
          patchNum: 1 as PatchSetNum,
          path: '/PATCHSET_LEVEL',
          rootId: 'e365b138_bed65caa' as UrlEncodedCommentId,
          commentSide: CommentSide.REVISION,
        },
      ];
      assert.equal(
        element._computeMessageContentCollapsed(
          '',
          undefined,
          undefined,
          threads
        ),
        'n'
      );
      assert.equal(
        element._computeMessageContent(false, '', undefined, undefined),
        ''
      );
    });
  });

  suite('when logged in but not admin', () => {
    setup(async () => {
      stubRestApi('getIsAdmin').returns(Promise.resolve(false));
      element = basicFixture.instantiate();
      await flush();
    });

    test('can see reply but not delete button', () => {
      element.message = {
        ...createChangeMessage(),
        id: '47c43261_55aa2c41' as ChangeMessageId,
        author: {
          _account_id: 1115495 as AccountId,
          name: 'Andrew Bonventre',
          email: 'andybons@chromium.org' as EmailAddress,
        },
        date: '2016-01-12 20:24:49.448000000' as Timestamp,
        message: 'Uploaded patch set 1.',
        _revision_number: 1 as PatchSetNum,
        expanded: true,
      };

      flush();
      assert.isFalse(
        queryAndAssert<HTMLElement>(element, '.replyActionContainer').hidden
      );
      assert.isTrue(queryAndAssert<HTMLElement>(element, '.deleteBtn').hidden);
    });

    test('reply button shown when message is updated', () => {
      element.message = undefined;
      flush();
      let replyEl = query(element, '.replyActionContainer');
      // We don't even expect the button to show up in the DOM when the message
      // is undefined.
      assert.isNotOk(replyEl);

      element.message = {
        ...createChangeMessage(),
        id: '47c43261_55aa2c41' as ChangeMessageId,
        author: {
          _account_id: 1115495 as AccountId,
          name: 'Andrew Bonventre',
          email: 'andybons@chromium.org' as EmailAddress,
        },
        date: '2016-01-12 20:24:49.448000000' as Timestamp,
        message: 'not empty',
        _revision_number: 1 as PatchSetNum,
        expanded: true,
      };
      flush();
      replyEl = queryAndAssert(element, '.replyActionContainer');
      assert.isOk(replyEl);
      assert.isFalse((replyEl as HTMLElement).hidden);
    });
  });
});
