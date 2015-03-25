// Copyright (C) 2014 The Android Open Source Project
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

package com.google.gerrit.acceptance.ssh;

import static com.google.common.truth.Truth.assertThat;
import static com.google.gerrit.acceptance.GitUtil.cloneProject;

import com.google.gerrit.acceptance.AbstractDaemonTest;
import com.google.gerrit.acceptance.NoHttpd;
import com.google.gerrit.reviewdb.client.Project;

import org.junit.Ignore;
import org.junit.Test;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@NoHttpd
// To see this test failing with 'verify: false', at least in the Jcsh 0.1.51
// remove bouncycastle libs from the classpath, and run:
// buck test //gerrit-acceptance-tests/src/test/java/com/google/gerrit/acceptance/ssh:JschVerifyFalseBugIT
public class JschVerifyFalseBugIT extends AbstractDaemonTest {

  @Test
  @Ignore// we know it works now, so let's not clone a project 500 times ;-)
  public void test() throws Exception {
    test(5);
  }

  private void test(int threads) throws InterruptedException,
      ExecutionException {
    Callable<Void> task = new Callable<Void>() {
      @Override
      public Void call() throws Exception {
        for (int i = 1; i < 100; i++) {
          String p = "p" + i;
          createProject(p);
          cloneProject(new Project.NameKey(p), sshSession);
        }
        return null;
      }
    };
    List<Callable<Void>> nCopies = Collections.nCopies(threads, task);
    List<Future<Void>> futures = Executors.newFixedThreadPool(threads)
        .invokeAll(nCopies);
    for (Future<Void> future : futures) {
      future.get();
    }
    assertThat(futures.size()).isEqualTo(threads);
  }
}
