// Copyright (C) 2013 The Android Open Source Project
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

package com.google.gerrit.server.query.change;

import com.google.gerrit.extensions.common.ProjectInfo;
import com.google.gerrit.index.query.OrPredicate;
import com.google.gerrit.index.query.Predicate;
import com.google.gerrit.reviewdb.client.Project;
import com.google.gerrit.server.CurrentUser;
import com.google.gerrit.server.permissions.PermissionBackendException;
import com.google.gerrit.server.project.ListChildProjects;
import com.google.gerrit.server.project.ProjectCache;
import com.google.gerrit.server.project.ProjectResource;
import com.google.gerrit.server.project.ProjectState;
import com.google.inject.Provider;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ParentProjectPredicate extends OrPredicate<ChangeData> {
  private static final Logger log = LoggerFactory.getLogger(ParentProjectPredicate.class);

  protected final String value;

  public ParentProjectPredicate(
      ProjectCache projectCache,
      Provider<ListChildProjects> listChildProjects,
      Provider<CurrentUser> self,
      String value) {
    super(predicates(projectCache, listChildProjects, self, value));
    this.value = value;
  }

  protected static List<Predicate<ChangeData>> predicates(
      ProjectCache projectCache,
      Provider<ListChildProjects> listChildProjects,
      Provider<CurrentUser> self,
      String value) {
    ProjectState projectState = projectCache.get(new Project.NameKey(value));
    if (projectState == null) {
      return Collections.emptyList();
    }

    List<Predicate<ChangeData>> r = new ArrayList<>();
    r.add(new ProjectPredicate(projectState.getName()));
    try {
      ProjectResource proj = new ProjectResource(projectState, self.get());
      ListChildProjects children = listChildProjects.get();
      children.setRecursive(true);
      for (ProjectInfo p : children.apply(proj)) {
        r.add(new ProjectPredicate(p.name));
      }
    } catch (PermissionBackendException e) {
      log.warn("cannot check permissions to expand child projects", e);
    }
    return r;
  }

  @Override
  public String toString() {
    return ChangeQueryBuilder.FIELD_PARENTPROJECT + ":" + value;
  }
}
