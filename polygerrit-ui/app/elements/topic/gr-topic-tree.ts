/**
 * @license
 * Copyright (C) 2021 The Android Open Source Project
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

import './gr-topic-tree-repo';
import {customElement, property, state} from 'lit/decorators';
import {LitElement, html, PropertyValues} from 'lit-element/lit-element';
import {getAppContext} from '../../services/app-context';
import '../shared/gr-button/gr-button';
import {ChangeInfo, RepoName} from '../../api/rest-api';

/**
 * A tree-like dashboard showing changes related to a topic, organized by
 * repository.
 */
@customElement('gr-topic-tree')
export class GrTopicTree extends LitElement {
  @property({type: String})
  topicName?: string;

  @state()
  private changesByRepo = new Map<RepoName, ChangeInfo[]>();

  private restApiService = getAppContext().restApiService;

  override willUpdate(changedProperties: PropertyValues) {
    // TODO: Receive data from the model once it is added.
    if (changedProperties.has('topicName')) {
      this.loadAndSortChangesFromTopic();
    }
  }

  override render() {
    return html`
      <table>
        <thead>
          <tr>
            <td>Size</td>
            <td>Subject</td>
            <td>Topic</td>
            <td>Branch</td>
            <td>Owner</td>
            <td>Status</td>
          </tr>
        </thead>
        <tbody>
          ${Array.from(this.changesByRepo).map(([repoName, changes]) =>
            this.renderRepoSection(repoName, changes)
          )}
        </tbody>
      </table>
    `;
  }

  private renderRepoSection(repoName: RepoName, changes: ChangeInfo[]) {
    return html`
      <gr-topic-tree-repo
        .repoName=${repoName}
        .changes=${changes}
      ></gr-topic-tree-repo>
    `;
  }

  private async loadAndSortChangesFromTopic(): Promise<void> {
    const changesInTopic = this.topicName
      ? await this.restApiService.getChangesWithSameTopic(this.topicName)
      : [];
    const changesSubmittedTogether = await this.loadChangesSubmittedTogether(
      changesInTopic
    );
    this.changesByRepo.clear();
    for (const change of changesSubmittedTogether) {
      if (this.changesByRepo.has(change.project)) {
        this.changesByRepo.get(change.project)!.push(change);
      } else {
        this.changesByRepo.set(change.project, [change]);
      }
    }
    this.requestUpdate();
  }

  private async loadChangesSubmittedTogether(
    changesInTopic?: ChangeInfo[]
  ): Promise<ChangeInfo[]> {
    // All changes in the topic will be submitted together, so we can use any of
    // them for the request to getChangesSubmittedTogether as long as the topic
    // is not empty.
    if (!changesInTopic || changesInTopic.length === 0) {
      return [];
    }
    const response = await this.restApiService.getChangesSubmittedTogether(
      changesInTopic[0]._number,
      ['NON_VISIBLE_CHANGES', 'CURRENT_REVISION', 'CURRENT_COMMIT']
    );
    return response?.changes ?? [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gr-topic-tree': GrTopicTree;
  }
}
