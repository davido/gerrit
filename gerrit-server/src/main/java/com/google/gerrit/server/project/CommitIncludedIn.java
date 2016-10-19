// Copyright (C) 2016 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.gerrit.server.project;

import com.google.gerrit.extensions.api.changes.IncludedInInfo;
import com.google.gerrit.extensions.restapi.RestApiException;
import com.google.gerrit.extensions.restapi.RestReadView;
import com.google.gerrit.reviewdb.client.Project;
import com.google.gerrit.server.change.IncludedIn;
import com.google.gwtorm.server.OrmException;
import com.google.inject.Inject;
import com.google.inject.Singleton;

import org.eclipse.jgit.revwalk.RevCommit;

import java.io.IOException;

@Singleton
class CommitIncludedIn implements RestReadView<CommitResource> {
  private IncludedIn includedIn;

  @Inject
  CommitIncludedIn(IncludedIn includedIn) {
    this.includedIn = includedIn;
  }

  @Override
  public IncludedInInfo apply(CommitResource rsrc)
      throws RestApiException, OrmException, IOException {
    RevCommit commit = rsrc.getCommit();
    Project.NameKey project = rsrc.getProject().getProject().getNameKey();
    return includedIn.apply(project, commit.getId().getName());
  }
}
