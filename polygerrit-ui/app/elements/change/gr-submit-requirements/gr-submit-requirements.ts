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
import '../../shared/gr-label-info/gr-label-info';
import '../gr-submit-requirement-hovercard/gr-submit-requirement-hovercard';
import '../gr-trigger-vote-hovercard/gr-trigger-vote-hovercard';
import '../gr-change-summary/gr-change-summary';
import '../../shared/gr-limited-text/gr-limited-text';
import {LitElement, css, html, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators';
import {ParsedChangeInfo} from '../../../types/types';
import {
  AccountInfo,
  isDetailedLabelInfo,
  isQuickLabelInfo,
  LabelInfo,
  LabelNameToInfoMap,
  SubmitRequirementResultInfo,
  SubmitRequirementStatus,
} from '../../../api/rest-api';
import {
  extractAssociatedLabels,
  getAllUniqueApprovals,
  getRequirements,
  getTriggerVotes,
  hasNeutralStatus,
  hasVotes,
  iconForStatus,
  orderSubmitRequirements,
} from '../../../utils/label-util';
import {fontStyles} from '../../../styles/gr-font-styles';
import {charsOnly} from '../../../utils/string-util';
import {subscribe} from '../../lit/subscription-controller';
import {CheckRun} from '../../../models/checks/checks-model';
import {getResultsOf, hasResultsOf} from '../../../models/checks/checks-util';
import {Category} from '../../../api/checks';
import '../../shared/gr-vote-chip/gr-vote-chip';
import {fireShowPrimaryTab} from '../../../utils/event-util';
import {PrimaryTab} from '../../../constants/constants';
import {submitRequirementsStyles} from '../../../styles/gr-submit-requirements-styles';
import {resolve} from '../../../models/dependency';
import {checksModelToken} from '../../../models/checks/checks-model';

/**
 * @attr {Boolean} suppress-title - hide titles, currently for hovercard view
 */
@customElement('gr-submit-requirements')
export class GrSubmitRequirements extends LitElement {
  @property({type: Object})
  change?: ParsedChangeInfo;

  @property({type: Object})
  account?: AccountInfo;

  @property({type: Boolean})
  mutable?: boolean;

  @property({type: Boolean, attribute: 'disable-hovercards'})
  disableHovercards = false;

  @property({type: Boolean, attribute: 'disable-endpoints'})
  disableEndpoints = false;

  @state()
  runs: CheckRun[] = [];

  static override get styles() {
    return [
      fontStyles,
      submitRequirementsStyles,
      css`
        :host([suppress-title]) .metadata-title {
          display: none;
        }
        .metadata-title {
          color: var(--deemphasized-text-color);
          padding-left: var(--metadata-horizontal-padding);
          margin: 0 0 var(--spacing-s);
          padding-top: var(--spacing-s);
        }
        iron-icon {
          width: var(--line-height-normal, 20px);
          height: var(--line-height-normal, 20px);
        }
        .requirements,
        section.trigger-votes {
          margin-left: var(--spacing-l);
        }
        .trigger-votes {
          padding-top: var(--spacing-s);
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-s);
          /* Setting max-width as defined in Submit Requirements design,
           *  to wrap overflowed items to next row.
           */
          max-width: 390px;
        }
        gr-limited-text.name {
          font-weight: var(--font-weight-bold);
        }
        table {
          border-collapse: collapse;
          border-spacing: 0;
        }
        td {
          padding: var(--spacing-s);
          white-space: nowrap;
        }
        .votes-cell {
          display: flex;
        }
        .check-error {
          margin-right: var(--spacing-l);
        }
        .check-error iron-icon {
          color: var(--error-foreground);
          vertical-align: top;
        }
        gr-vote-chip {
          margin-right: var(--spacing-s);
        }
        gr-checks-chip {
          /* .checksChip has top: 2px, this is canceling it */
          margin-top: -2px;
        }
      `,
    ];
  }

  private readonly getChecksModel = resolve(this, checksModelToken);

  override connectedCallback(): void {
    super.connectedCallback();
    subscribe(
      this,
      this.getChecksModel().allRunsLatestPatchsetLatestAttempt$,
      x => (this.runs = x)
    );
  }

  override render() {
    const submit_requirements = orderSubmitRequirements(
      getRequirements(this.change)
    );

    return html` <h3
        class="metadata-title heading-3"
        id="submit-requirements-caption"
      >
        Submit Requirements
      </h3>
      <table class="requirements" aria-labelledby="submit-requirements-caption">
        <thead hidden>
          <tr>
            <th>Status</th>
            <th>Name</th>
            <th>Votes</th>
          </tr>
        </thead>
        <tbody>
          ${submit_requirements.map((requirement, index) =>
            this.renderRequirement(requirement, index)
          )}
        </tbody>
      </table>
      ${this.disableHovercards
        ? ''
        : submit_requirements.map(
            (requirement, index) => html`
              <gr-submit-requirement-hovercard
                for="requirement-${index}-${charsOnly(requirement.name)}"
                .requirement="${requirement}"
                .change="${this.change}"
                .account="${this.account}"
                .mutable="${this.mutable ?? false}"
              ></gr-submit-requirement-hovercard>
            `
          )}
      ${this.renderTriggerVotes()}`;
  }

  renderRequirement(requirement: SubmitRequirementResultInfo, index: number) {
    return html`
      <tr id="requirement-${index}-${charsOnly(requirement.name)}">
        <td>${this.renderStatus(requirement.status)}</td>
        <td class="name">
          <gr-limited-text
            class="name"
            limit="25"
            .text="${requirement.name}"
          ></gr-limited-text>
        </td>
        <td>
          ${this.renderEndpoint(
            requirement,
            html`${this.renderVotesAndChecksChips(requirement)}
            ${this.renderOverrideLabels(requirement)}`
          )}
        </td>
      </tr>
    `;
  }

  renderEndpoint(
    requirement: SubmitRequirementResultInfo,
    slot: TemplateResult
  ) {
    if (this.disableEndpoints) return slot;

    const endpointName = this.calculateEndpointName(requirement.name);
    return html`<gr-endpoint-decorator
      class="votes-cell"
      name="${endpointName}"
    >
      <gr-endpoint-param
        name="change"
        .value=${this.change}
      ></gr-endpoint-param>
      <gr-endpoint-param
        name="requirement"
        .value=${requirement}
      ></gr-endpoint-param>
      ${slot}
    </gr-endpoint-decorator>`;
  }

  renderStatus(status: SubmitRequirementStatus) {
    const icon = iconForStatus(status);
    return html`<iron-icon
      class="${icon}"
      icon="gr-icons:${icon}"
      role="img"
      aria-label="${status.toLowerCase()}"
    ></iron-icon>`;
  }

  renderVotesAndChecksChips(requirement: SubmitRequirementResultInfo) {
    if (requirement.status === SubmitRequirementStatus.ERROR) {
      return html`<span class="error">Error</span>`;
    }
    const requirementLabels = extractAssociatedLabels(requirement);
    const allLabels = this.change?.labels ?? {};
    const associatedLabels = Object.keys(allLabels).filter(label =>
      requirementLabels.includes(label)
    );

    const everyAssociatedLabelsIsWithoutVotes = associatedLabels.every(
      label => !hasVotes(allLabels[label])
    );

    const checksChips = this.renderChecks(requirement);

    if (everyAssociatedLabelsIsWithoutVotes) {
      return checksChips || html`No votes`;
    }

    return html`${associatedLabels.map(label =>
      this.renderLabelVote(label, allLabels)
    )}
    ${checksChips}`;
  }

  renderLabelVote(label: string, labels: LabelNameToInfoMap) {
    const labelInfo = labels[label];
    if (isDetailedLabelInfo(labelInfo)) {
      const uniqueApprovals = getAllUniqueApprovals(labelInfo).filter(
        approval => !hasNeutralStatus(labelInfo, approval)
      );
      return uniqueApprovals.map(
        approvalInfo =>
          html`<gr-vote-chip
            .vote="${approvalInfo}"
            .label="${labelInfo}"
            .more="${(labelInfo.all ?? []).filter(
              other => other.value === approvalInfo.value
            ).length > 1}"
          ></gr-vote-chip>`
      );
    } else if (isQuickLabelInfo(labelInfo)) {
      return [html`<gr-vote-chip .label="${labelInfo}"></gr-vote-chip>`];
    } else {
      return html``;
    }
  }

  renderChecks(requirement: SubmitRequirementResultInfo) {
    const requirementLabels = extractAssociatedLabels(requirement);
    const requirementRuns = this.runs
      .filter(run => hasResultsOf(run, Category.ERROR))
      .filter(
        run => run.labelName && requirementLabels.includes(run.labelName)
      );
    const runsCount = requirementRuns.reduce(
      (sum, run) => sum + getResultsOf(run, Category.ERROR).length,
      0
    );
    if (runsCount === 0) return;
    const links = [];
    if (requirementRuns.length === 1 && requirementRuns[0].statusLink) {
      links.push(requirementRuns[0].statusLink);
    }
    return html`<gr-checks-chip
      .text=${`${runsCount}`}
      .links=${links}
      .statusOrCategory=${Category.ERROR}
      @click="${() => {
        fireShowPrimaryTab(this, PrimaryTab.CHECKS, false, {
          checksTab: {
            statusOrCategory: Category.ERROR,
          },
        });
      }}"
    ></gr-checks-chip>`;
  }

  renderOverrideLabels(requirement: SubmitRequirementResultInfo) {
    if (requirement.status !== SubmitRequirementStatus.OVERRIDDEN) return;
    const requirementLabels = extractAssociatedLabels(
      requirement,
      'onlyOverride'
    ).filter(label => {
      const allLabels = this.change?.labels ?? {};
      return allLabels[label] && hasVotes(allLabels[label]);
    });
    return requirementLabels.map(
      label => html`<span class="overrideLabel">${label}</span>`
    );
  }

  renderTriggerVotes() {
    const labels = this.change?.labels ?? {};
    const triggerVotes = getTriggerVotes(this.change).filter(label =>
      hasVotes(labels[label])
    );
    if (!triggerVotes.length) return;
    return html`<h3 class="metadata-title heading-3">Trigger Votes</h3>
      <section class="trigger-votes">
        ${triggerVotes.map(
          label =>
            html`<gr-trigger-vote
              .label="${label}"
              .labelInfo="${labels[label]}"
              .change="${this.change}"
              .account="${this.account}"
              .mutable="${this.mutable ?? false}"
            ></gr-trigger-vote>`
        )}
      </section>`;
  }

  // not private for tests
  calculateEndpointName(requirementName: string) {
    // remove class name annnotation after ~
    const name = requirementName.split('~')[0];
    const normalizedName = charsOnly(name).toLowerCase();
    return `submit-requirement-${normalizedName}`;
  }
}

@customElement('gr-trigger-vote')
export class GrTriggerVote extends LitElement {
  @property()
  label?: string;

  @property({type: Object})
  labelInfo?: LabelInfo;

  @property({type: Object})
  change?: ParsedChangeInfo;

  @property({type: Object})
  account?: AccountInfo;

  @property({type: Boolean})
  mutable?: boolean;

  static override get styles() {
    return css`
      :host {
        display: block;
      }
      .container {
        box-sizing: border-box;
        border: 1px solid var(--border-color);
        border-radius: calc(var(--border-radius) + 2px);
        background-color: var(--background-color-primary);
        display: flex;
        padding: 0;
        padding-left: var(--spacing-s);
        padding-right: var(--spacing-xxs);
        align-items: center;
      }
      .label {
        padding-right: var(--spacing-s);
        font-weight: var(--font-weight-bold);
      }
      gr-vote-chip {
        --gr-vote-chip-width: 14px;
        --gr-vote-chip-height: 14px;
        margin-right: 0px;
        margin-left: var(--spacing-xs);
      }
      gr-vote-chip:first-of-type {
        margin-left: 0px;
      }
    `;
  }

  override render() {
    if (!this.labelInfo) return;
    return html`
      <div class="container">
        <gr-trigger-vote-hovercard
          .labelName=${this.label}
          .labelInfo=${this.labelInfo}
        >
          <gr-label-info
            slot="label-info"
            .change=${this.change}
            .account=${this.account}
            .mutable=${this.mutable}
            .label=${this.label}
            .labelInfo=${this.labelInfo}
            .showAllReviewers=${false}
          ></gr-label-info>
        </gr-trigger-vote-hovercard>
        <span class="label">${this.label}</span>
        ${this.renderVotes()}
      </div>
    `;
  }

  private renderVotes() {
    const {labelInfo} = this;
    if (!labelInfo) return;
    if (isDetailedLabelInfo(labelInfo)) {
      const approvals = getAllUniqueApprovals(labelInfo).filter(
        approval => !hasNeutralStatus(labelInfo, approval)
      );
      return approvals.map(
        approvalInfo => html`<gr-vote-chip
          .vote="${approvalInfo}"
          .label="${labelInfo}"
        ></gr-vote-chip>`
      );
    } else if (isQuickLabelInfo(labelInfo)) {
      return [html`<gr-vote-chip .label="${this.labelInfo}"></gr-vote-chip>`];
    } else {
      return html``;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gr-submit-requirements': GrSubmitRequirements;
    'gr-trigger-vote': GrTriggerVote;
  }
}
