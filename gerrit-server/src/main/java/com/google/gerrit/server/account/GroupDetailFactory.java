// Copyright (C) 2009 The Android Open Source Project
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

package com.google.gerrit.server.account;

import com.google.gerrit.common.data.GroupDescription;
import com.google.gerrit.common.data.GroupDetail;
import com.google.gerrit.common.data.GroupReference;
import com.google.gerrit.common.errors.NoSuchGroupException;
import com.google.gerrit.reviewdb.client.Account;
import com.google.gerrit.reviewdb.client.AccountGroup;
import com.google.gerrit.reviewdb.client.AccountGroupInclude;
import com.google.gerrit.reviewdb.client.AccountGroupMember;
import com.google.gerrit.reviewdb.server.ReviewDb;
import com.google.gwtorm.server.OrmException;
import com.google.inject.Inject;
import com.google.inject.assistedinject.Assisted;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Callable;

public class GroupDetailFactory implements Callable<GroupDetail> {
  public interface Factory {
    GroupDetailFactory create(AccountGroup.Id groupId);
  }

  private final ReviewDb db;
  private final GroupControl.Factory groupControl;
  private final GroupCache groupCache;
  private final GroupBackend groupBackend;
  private final AccountInfoCacheFactory aic;
  private final GroupInfoCacheFactory gic;

  private final AccountGroup.Id groupId;
  private GroupControl control;

  @Inject
  GroupDetailFactory(final ReviewDb db,
      final GroupControl.Factory groupControl, final GroupCache groupCache,
      final GroupBackend groupBackend,
      final AccountInfoCacheFactory.Factory accountInfoCacheFactory,
      final GroupInfoCacheFactory.Factory groupInfoCacheFactory,
      @Assisted final AccountGroup.Id groupId) {
    this.db = db;
    this.groupControl = groupControl;
    this.groupCache = groupCache;
    this.groupBackend = groupBackend;
    this.aic = accountInfoCacheFactory.create();
    this.gic = groupInfoCacheFactory.create();

    this.groupId = groupId;
  }

  @Override
  public GroupDetail call() throws OrmException, NoSuchGroupException {
    control = groupControl.validateFor(groupId);
    final AccountGroup group = groupCache.get(groupId);
    final GroupDetail detail = new GroupDetail();
    detail.setGroup(group);
    GroupDescription.Basic ownerGroup = groupBackend.get(group.getOwnerGroupUUID());
    if (ownerGroup != null) {
      detail.setOwnerGroup(GroupReference.forGroup(ownerGroup));
    }
    switch (group.getType()) {
      case INTERNAL:
        detail.setMembers(loadMembers());
        detail.setIncludes(loadIncludes());
        break;
      case SYSTEM:
        break;
    }
    detail.setAccounts(aic.create());
    detail.setCanModify(control.isOwner());
    detail.setGroups(gic.create());
    return detail;
  }

  private List<AccountGroupMember> loadMembers() throws OrmException {
    List<AccountGroupMember> members = new ArrayList<AccountGroupMember>();
    for (final AccountGroupMember m : db.accountGroupMembers().byGroup(groupId)) {
      if (control.canSeeMember(m.getAccountId())) {
        aic.want(m.getAccountId());
        members.add(m);
      }
    }

    Collections.sort(members, new Comparator<AccountGroupMember>() {
      public int compare(final AccountGroupMember o1,
          final AccountGroupMember o2) {
        final Account a = aic.get(o1.getAccountId());
        final Account b = aic.get(o2.getAccountId());
        return n(a).compareTo(n(b));
      }

      private String n(final Account a) {
        String n = a.getFullName();
        if (n != null && n.length() > 0) {
          return n;
        }

        n = a.getPreferredEmail();
        if (n != null && n.length() > 0) {
          return n;
        }

        return a.getId().toString();
      }
    });
    return members;
  }

  private List<AccountGroupInclude> loadIncludes() throws OrmException {
    List<AccountGroupInclude> groups = new ArrayList<AccountGroupInclude>();

    for (final AccountGroupInclude m : db.accountGroupIncludes().byGroup(groupId)) {
      if (control.canSeeGroup(m.getIncludeId())) {
        gic.want(m.getIncludeId());
        groups.add(m);
      }
    }

    Collections.sort(groups, new Comparator<AccountGroupInclude>() {
      public int compare(final AccountGroupInclude o1,
          final AccountGroupInclude o2) {
        final AccountGroup a = gic.get(o1.getIncludeId());
        final AccountGroup b = gic.get(o2.getIncludeId());
        return n(a).compareTo(n(b));
      }

      private String n(final AccountGroup a) {
        String n = a.getName();
        if (n != null && n.length() > 0) {
          return n;
        }

        n = a.getDescription();
        if (n != null && n.length() > 0) {
          return n;
        }

        return a.getId().toString();
      }
    });

    return groups;
  }
}
