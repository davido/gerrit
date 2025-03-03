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
/* eslint-disable lit/no-legacy-template-syntax,lit/prefer-static-styles */
import {PolymerElement} from '@polymer/polymer/polymer-element';
import {html} from '@polymer/polymer/lib/utils/html-tag';
import {customElement, property} from '@polymer/decorators';

declare global {
  interface HTMLElementTagNameMap {
    'gr-custom-plugin-header': GrCustomPluginHeader;
  }
}

@customElement('gr-custom-plugin-header')
export class GrCustomPluginHeader extends PolymerElement {
  @property({type: String})
  logoUrl = '';

  @property({type: String})
  override title = '';

  static get template() {
    return html`
      <style>
        img {
          width: 1em;
          height: 1em;
          vertical-align: middle;
        }
        .title {
          margin-left: var(--spacing-xs);
        }
      </style>
      <span>
        <img src="[[logoUrl]]" hidden$="[[!logoUrl]]" />
        <span class="title">[[title]]</span>
      </span>
    `;
  }
}
