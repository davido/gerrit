// Copyright (C) 2015 The Android Open Source Project
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

package com.google.gerrit.server.change;

import com.google.common.hash.Hasher;
import com.google.common.hash.Hashing;
import com.google.gerrit.extensions.common.ActionInfo;
import com.google.gerrit.extensions.restapi.ETagView;
import com.google.gerrit.extensions.restapi.Response;
import com.google.gerrit.reviewdb.client.Change;
import com.google.gerrit.reviewdb.server.ReviewDb;
import com.google.gerrit.server.CurrentUser;
import com.google.gerrit.server.config.GerritServerConfig;
import com.google.gerrit.server.git.ChangeSet;
import com.google.gerrit.server.git.MergeSuperSet;
import com.google.gerrit.server.project.ProjectControl;
import com.google.gwtorm.server.OrmException;
import com.google.gwtorm.server.OrmRuntimeException;
import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.Singleton;

import org.eclipse.jgit.lib.Config;

import java.io.IOException;
import java.util.Map;

@Singleton
public class GetRevisionActions implements ETagView<RevisionResource> {
  private final ActionJson delegate;
  private final Config config;
  private final Provider<ReviewDb> dbProvider;
  private final MergeSuperSet mergeSuperSet;

  @Inject
  GetRevisionActions(
      ActionJson delegate,
      Provider<ReviewDb> dbProvider,
      MergeSuperSet mergeSuperSet,
      @GerritServerConfig Config config) {
    this.delegate = delegate;
    this.dbProvider = dbProvider;
    this.mergeSuperSet = mergeSuperSet;
    this.config = config;
  }

  @Override
  public Response<Map<String, ActionInfo>> apply(RevisionResource rsrc) {
    return Response.withMustRevalidate(delegate.format(rsrc));
  }

  @Override
  public String getETag(RevisionResource rsrc) {
    Hasher h = Hashing.md5().newHasher();
    CurrentUser user = rsrc.getControl().getCurrentUser();
    try {
      rsrc.getChangeResource().prepareETag(h, user);
      h.putBoolean(Submit.wholeTopicEnabled(config));
      ReviewDb db = dbProvider.get();
      ChangeSet cs = mergeSuperSet.completeChangeSet(db,
          ChangeSet.create(rsrc.getChange()));
      ProjectControl ctl = rsrc.getControl().getProjectControl();
      for (Change c : cs.changes()) {
        new ChangeResource(ctl.controlFor(c)).prepareETag(h, user);
      }
    } catch (IOException | OrmException e) {
      throw new OrmRuntimeException(e);
    }
    return h.hash().toString();
  }
}
