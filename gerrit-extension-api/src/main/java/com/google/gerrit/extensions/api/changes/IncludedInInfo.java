// Copyright (C) 2017 The Android Open Source Project
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
package com.google.gerrit.extensions.api.changes;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public class IncludedInInfo {
  public List<String> branches;
  public List<String> tags;
  public Map<String, Collection<String>> external;

  public IncludedInInfo(List<String> branches,
      List<String> tags,
      Map<String, Collection<String>> external) {
    this.branches = branches;
    this.tags = tags;
    this.external = external;
  }
}