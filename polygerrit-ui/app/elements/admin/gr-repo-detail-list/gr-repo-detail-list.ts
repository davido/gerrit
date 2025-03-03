/**
 * @license
 * Copyright (C) 2017 The Android Open Source Project
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

import '@polymer/iron-input/iron-input';
import '../../shared/gr-account-link/gr-account-link';
import '../../shared/gr-button/gr-button';
import '../../shared/gr-date-formatter/gr-date-formatter';
import '../../shared/gr-dialog/gr-dialog';
import '../../shared/gr-list-view/gr-list-view';
import '../../shared/gr-overlay/gr-overlay';
import '../gr-create-pointer-dialog/gr-create-pointer-dialog';
import '../gr-confirm-delete-item-dialog/gr-confirm-delete-item-dialog';
import {encodeURL} from '../../../utils/url-util';
import {GrOverlay} from '../../shared/gr-overlay/gr-overlay';
import {GrCreatePointerDialog} from '../gr-create-pointer-dialog/gr-create-pointer-dialog';
import {
  BranchInfo,
  GitPersonInfo,
  GitRef,
  ProjectInfo,
  RepoName,
  TagInfo,
  WebLinkInfo,
} from '../../../types/common';
import {AppElementRepoParams} from '../../gr-app-types';
import {RepoDetailView} from '../../core/gr-navigation/gr-navigation';
import {firePageError} from '../../../utils/event-util';
import {getAppContext} from '../../../services/app-context';
import {ErrorCallback} from '../../../api/rest';
import {SHOWN_ITEMS_COUNT} from '../../../constants/constants';
import {formStyles} from '../../../styles/gr-form-styles';
import {tableStyles} from '../../../styles/gr-table-styles';
import {sharedStyles} from '../../../styles/shared-styles';
import {LitElement, PropertyValues, css, html} from 'lit';
import {customElement, query, property, state} from 'lit/decorators';
import {BindValueChangeEvent} from '../../../types/events';
import {assertIsDefined} from '../../../utils/common-util';
import {ifDefined} from 'lit/directives/if-defined';

const PGP_START = '-----BEGIN PGP SIGNATURE-----';

@customElement('gr-repo-detail-list')
export class GrRepoDetailList extends LitElement {
  @query('#overlay') private readonly overlay?: GrOverlay;

  @query('#createOverlay') private readonly createOverlay?: GrOverlay;

  @query('#createNewModal')
  private readonly createNewModal?: GrCreatePointerDialog;

  @property({type: Object})
  params?: AppElementRepoParams;

  // private but used in test
  @state() detailType?: RepoDetailView.BRANCHES | RepoDetailView.TAGS;

  // private but used in test
  @state() isOwner = false;

  @state() private loggedIn = false;

  @state() private offset = 0;

  // private but used in test
  @state() repo?: RepoName;

  // private but used in test
  @state() items?: BranchInfo[] | TagInfo[];

  @state() private readonly itemsPerPage = 25;

  @state() private loading = true;

  @state() private filter?: string;

  @state() private refName?: GitRef;

  @state() private newItemName = false;

  // private but used in test
  @state() isEditing = false;

  // private but used in test
  @state() revisedRef?: GitRef;

  private readonly restApiService = getAppContext().restApiService;

  static override get styles() {
    return [
      formStyles,
      tableStyles,
      sharedStyles,
      css`
        .tags td.name {
          min-width: 25em;
        }
        td.name,
        td.revision,
        td.message {
          word-break: break-word;
        }
        td.revision.tags {
          width: 27em;
        }
        td.message,
        td.tagger {
          max-width: 15em;
        }
        .editing .editItem {
          display: inherit;
        }
        .editItem,
        .editing .editBtn,
        .canEdit .revisionNoEditing,
        .editing .revisionWithEditing,
        .revisionEdit,
        .hideItem {
          display: none;
        }
        .revisionEdit gr-button {
          margin-left: var(--spacing-m);
        }
        .editBtn {
          margin-left: var(--spacing-l);
        }
        .canEdit .revisionEdit {
          align-items: center;
          display: flex;
        }
        .deleteButton:not(.show) {
          display: none;
        }
        .tagger.hide {
          display: none;
        }
      `,
    ];
  }

  override render() {
    return html`
      <gr-list-view
        .createNew=${this.loggedIn}
        .filter=${this.filter}
        .itemsPerPage=${this.itemsPerPage}
        .items=${this.items}
        .loading=${this.loading}
        .offset=${this.offset}
        .path=${this.getPath(this.repo, this.detailType)}
        @create-clicked=${() => {
          this.handleCreateClicked();
        }}
      >
        <table id="list" class="genericList gr-form-styles">
          <tbody>
            <tr class="headerRow">
              <th class="name topHeader">Name</th>
              <th class="revision topHeader">Revision</th>
              <th
                class="message topHeader ${this.detailType ===
                RepoDetailView.BRANCHES
                  ? 'hideItem'
                  : ''}"
              >
                Message
              </th>
              <th
                class="tagger topHeader ${this.detailType ===
                RepoDetailView.BRANCHES
                  ? 'hideItem'
                  : ''}"
              >
                Tagger
              </th>
              <th class="repositoryBrowser topHeader">Repository Browser</th>
              <th class="delete topHeader"></th>
            </tr>
            <tr
              id="loading"
              class="loadingMsg ${this.loading ? 'loading' : ''}"
            >
              <td>Loading...</td>
            </tr>
          </tbody>
          <tbody class=${this.loading ? 'loading' : ''}>
            ${this.items
              ?.slice(0, SHOWN_ITEMS_COUNT)
              .map((item, index) => this.renderItemList(item, index))}
          </tbody>
        </table>
        <gr-overlay id="overlay" with-backdrop>
          <gr-confirm-delete-item-dialog
            class="confirmDialog"
            .item=${this.refName}
            .itemTypeName=${this.computeItemName(this.detailType)}
            @confirm=${() => this.handleDeleteItemConfirm()}
            @cancel=${() => {
              this.handleConfirmDialogCancel();
            }}
          ></gr-confirm-delete-item-dialog>
        </gr-overlay>
      </gr-list-view>
      <gr-overlay id="createOverlay" with-backdrop>
        <gr-dialog
          id="createDialog"
          ?disabled=${!this.newItemName}
          confirm-label="Create"
          @confirm=${() => {
            this.handleCreateItem();
          }}
          @cancel=${() => {
            this.handleCloseCreate();
          }}
        >
          <div class="header" slot="header">
            Create ${this.computeItemName(this.detailType)}
          </div>
          <div class="main" slot="main">
            <gr-create-pointer-dialog
              id="createNewModal"
              .detailType=${this.computeItemName(this.detailType)}
              .itemDetail=${this.detailType}
              .repoName=${this.repo}
              @update-item-name=${() => {
                this.handleUpdateItemName();
              }}
            ></gr-create-pointer-dialog>
          </div>
        </gr-dialog>
      </gr-overlay>
    `;
  }

  private renderItemList(item: BranchInfo | TagInfo, index: number) {
    return html`
      <tr class="table">
        <td class="${this.detailType} name">
          <a href=${ifDefined(this.computeFirstWebLink(item))}>
            ${this.stripRefs(item.ref, this.detailType)}
          </a>
        </td>
        <td
          class="${this.detailType} revision ${this.computeCanEditClass(
            item.ref,
            this.detailType,
            this.isOwner
          )}"
        >
          <span class="revisionNoEditing"> ${item.revision} </span>
          <span class="revisionEdit ${this.isEditing ? 'editing' : ''}">
            <span class="revisionWithEditing"> ${item.revision} </span>
            <gr-button
              class="editBtn"
              link
              data-index=${index}
              @click=${() => {
                this.handleEditRevision(index);
              }}
            >
              edit
            </gr-button>
            <iron-input
              class="editItem"
              .bindValue=${this.revisedRef}
              @bind-value-changed=${this.handleRevisedRefBindValueChanged}
            >
              <input />
            </iron-input>
            <gr-button
              class="cancelBtn editItem"
              link
              @click=${() => {
                this.handleCancelRevision();
              }}
            >
              Cancel
            </gr-button>
            <gr-button
              class="saveBtn editItem"
              link
              data-index=${index}
              ?disabled=${!this.revisedRef}
              @click=${() => {
                this.handleSaveRevision(index);
              }}
            >
              Save
            </gr-button>
          </span>
        </td>
        <td
          class="message ${this.detailType === RepoDetailView.BRANCHES
            ? 'hideItem'
            : ''}"
        >
          ${(item as TagInfo)?.message
            ? (item as TagInfo).message?.split(PGP_START)[0]
            : ''}
        </td>
        <td
          class="tagger ${this.detailType === RepoDetailView.BRANCHES
            ? 'hideItem'
            : ''}"
        >
          ${this.renderTagger((item as TagInfo).tagger)}
        </td>
        <td class="repositoryBrowser">
          ${this.computeWeblink(item).map(link => this.renderWeblink(link))}
        </td>
        <td class="delete">
          <gr-button
            class="deleteButton ${item.can_delete || this.isOwner
              ? 'show'
              : ''}"
            link
            data-index=${index}
            @click=${() => {
              this.handleDeleteItem(index);
            }}
          >
            Delete
          </gr-button>
        </td>
      </tr>
    `;
  }

  private renderTagger(tagger?: GitPersonInfo) {
    if (!tagger) return;

    return html`
      <div class="tagger">
        <gr-account-link .account=${tagger}> </gr-account-link>
        (<gr-date-formatter withTooltip .dateStr=${tagger.date}>
        </gr-date-formatter
        >)
      </div>
    `;
  }

  private renderWeblink(link: WebLinkInfo) {
    return html`
      <a href=${link.url} class="webLink" rel="noopener" target="_blank">
        (${link.name})
      </a>
    `;
  }

  override willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('params')) {
      this.paramsChanged();
    }
  }

  // private but used in test
  determineIfOwner(repo: RepoName) {
    return this.restApiService
      .getRepoAccess(repo)
      .then(access => (this.isOwner = !!access?.[repo]?.is_owner));
  }

  // private but used in test
  paramsChanged() {
    if (!this.params?.repo) {
      return Promise.reject(new Error('undefined repo'));
    }

    // paramsChanged is called before gr-admin-view can set _showRepoDetailList
    // to false and polymer removes this component, hence check for params
    if (
      !(
        this.params?.detail === RepoDetailView.BRANCHES ||
        this.params?.detail === RepoDetailView.TAGS
      )
    ) {
      return;
    }

    this.repo = this.params.repo;

    this.getLoggedIn().then(loggedIn => {
      this.loggedIn = loggedIn;
      if (loggedIn && this.repo) {
        this.determineIfOwner(this.repo);
      }
    });

    this.detailType = this.params.detail;

    this.filter = this.params?.filter ?? '';
    this.offset = Number(this.params?.offset ?? 0);
    if (!this.detailType)
      return Promise.reject(new Error('undefined detailType'));

    return this.getItems(
      this.filter,
      this.repo,
      this.itemsPerPage,
      this.offset,
      this.detailType
    );
  }

  // TODO(TS) Move this to object for easier read, understand.
  private getItems(
    filter: string | undefined,
    repo: RepoName | undefined,
    itemsPerPage: number,
    offset: number | undefined,
    detailType: string
  ) {
    if (filter === undefined || !repo || offset === undefined) {
      return Promise.reject(new Error('filter or repo or offset undefined'));
    }
    this.loading = true;
    this.items = [];

    const errFn: ErrorCallback = response => {
      firePageError(response);
    };

    if (detailType === RepoDetailView.BRANCHES) {
      return this.restApiService
        .getRepoBranches(filter, repo, itemsPerPage, offset, errFn)
        .then(items => {
          this.items = items ?? [];
          this.loading = false;
        })
        .finally(() => {
          this.loading = false;
        });
    } else if (detailType === RepoDetailView.TAGS) {
      return this.restApiService
        .getRepoTags(filter, repo, itemsPerPage, offset, errFn)
        .then(items => {
          this.items = items ?? [];
        })
        .finally(() => {
          this.loading = false;
        });
    }
    return Promise.reject(new Error('unknown detail type'));
  }

  private getPath(repo?: RepoName, detailType?: RepoDetailView) {
    return `/admin/repos/${encodeURL(repo ?? '', false)},${detailType}`;
  }

  private computeWeblink(repo: ProjectInfo | BranchInfo | TagInfo) {
    if (!repo.web_links) return [];
    const webLinks = repo.web_links;
    return webLinks.length ? webLinks : [];
  }

  private computeFirstWebLink(repo: ProjectInfo | BranchInfo | TagInfo) {
    const webLinks = this.computeWeblink(repo);
    return webLinks.length > 0 ? webLinks[0].url : undefined;
  }

  // private but used in test
  stripRefs(item: GitRef, detailType?: RepoDetailView) {
    if (detailType === RepoDetailView.BRANCHES) {
      return item.replace('refs/heads/', '');
    } else if (detailType === RepoDetailView.TAGS) {
      return item.replace('refs/tags/', '');
    }
    throw new Error('unknown detailType');
  }

  // private but used in test
  getLoggedIn() {
    return this.restApiService.getLoggedIn();
  }

  private computeCanEditClass(
    ref?: GitRef,
    detailType?: RepoDetailView,
    isOwner?: boolean
  ) {
    if (ref === undefined || detailType === undefined) return '';
    return isOwner && this.stripRefs(ref, detailType) === 'HEAD'
      ? 'canEdit'
      : '';
  }

  private handleEditRevision(index: number) {
    if (!this.items) return;

    this.revisedRef = this.items[index].revision as GitRef;
    this.isEditing = true;
  }

  private handleCancelRevision() {
    this.isEditing = false;
  }

  // private but used in test
  handleSaveRevision(index: number) {
    if (this.revisedRef && this.repo)
      this.setRepoHead(this.repo, this.revisedRef, index);
  }

  // private but used in test
  setRepoHead(repo: RepoName, ref: GitRef, index: number) {
    if (!this.items) return;
    return this.restApiService.setRepoHead(repo, ref).then(res => {
      if (res.status < 400) {
        this.isEditing = false;
        this.items![index].revision = ref;
        // This is needed to refresh 'items' property with fresh data,
        // specifically can_delete from the json response.
        this.getItems(
          this.filter,
          this.repo,
          this.itemsPerPage,
          this.offset,
          this.detailType!
        );
      }
    });
  }

  // private but used in test
  computeItemName(detailType?: RepoDetailView) {
    if (detailType === undefined) return '';
    if (detailType === RepoDetailView.BRANCHES) {
      return 'Branch';
    } else if (detailType === RepoDetailView.TAGS) {
      return 'Tag';
    }
    throw new Error('unknown detailType');
  }

  private handleDeleteItemConfirm() {
    assertIsDefined(this.overlay, 'overlay');
    this.overlay.close();
    if (!this.repo || !this.refName) {
      return Promise.reject(new Error('undefined repo or refName'));
    }
    if (this.detailType === RepoDetailView.BRANCHES) {
      return this.restApiService
        .deleteRepoBranches(this.repo, this.refName)
        .then(itemDeleted => {
          if (itemDeleted.status === 204) {
            this.getItems(
              this.filter,
              this.repo,
              this.itemsPerPage,
              this.offset,
              this.detailType!
            );
          }
        });
    } else if (this.detailType === RepoDetailView.TAGS) {
      return this.restApiService
        .deleteRepoTags(this.repo, this.refName)
        .then(itemDeleted => {
          if (itemDeleted.status === 204) {
            this.getItems(
              this.filter,
              this.repo,
              this.itemsPerPage,
              this.offset,
              this.detailType!
            );
          }
        });
    }
    return Promise.reject(new Error('unknown detail type'));
  }

  private handleConfirmDialogCancel() {
    assertIsDefined(this.overlay, 'overlay');
    this.overlay.close();
  }

  private handleDeleteItem(index: number) {
    if (!this.items) return;
    assertIsDefined(this.overlay, 'overlay');
    const name = this.stripRefs(
      this.items[index].ref,
      this.detailType
    ) as GitRef;
    if (!name) return;
    this.refName = name;
    this.overlay.open();
  }

  // private but used in test
  handleCreateItem() {
    assertIsDefined(this.createNewModal, 'createNewModal');
    this.createNewModal.handleCreateItem();
    this.handleCloseCreate();
  }

  // private but used in test
  handleCloseCreate() {
    assertIsDefined(this.createOverlay, 'createOverlay');
    this.createOverlay.close();
  }

  // private but used in test
  handleCreateClicked() {
    assertIsDefined(this.createOverlay, 'createOverlay');
    this.createOverlay.open();
  }

  private handleUpdateItemName() {
    assertIsDefined(this.createNewModal, 'createNewModal');
    this.newItemName = !!this.createNewModal.itemName;
  }

  private handleRevisedRefBindValueChanged(e: BindValueChangeEvent) {
    this.revisedRef = e.detail.value as GitRef;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gr-repo-detail-list': GrRepoDetailList;
  }
}
