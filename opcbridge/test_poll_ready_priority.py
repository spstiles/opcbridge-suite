#!/usr/bin/env python3
"""Exercise the production work-selection fragment with an overdue startup heap."""
from pathlib import Path
import subprocess
import tempfile
source = Path(__file__).with_name('main.cpp').read_text()
a = source.index('const bool completedLogix =')
b = source.index('if (nowSteady < top.next_poll)', a)
selection = source[a:b]
program = r'''
#include <chrono>
#include <queue>
#include <vector>
#include <unordered_map>
#include <cassert>
int main() {
 using Clock=std::chrono::steady_clock;
 struct HeapItem { Clock::time_point next_poll; size_t idx; };
 struct Compare { bool operator()(const HeapItem&a,const HeapItem&b) const {return a.next_poll>b.next_poll;} };
 struct Tag {Clock::time_point next_poll;};
 struct Spec {std::vector<Tag> tags; } spec;
 const auto now=Clock::now();
 spec.tags={{now-std::chrono::seconds(30)},{now}};
 std::priority_queue<HeapItem,std::vector<HeapItem>,Compare> heap;
 heap.push({spec.tags[0].next_poll,0});
 heap.push({spec.tags[1].next_poll,1});
 std::unordered_map<size_t,int> logixPrefetch{{1,0}};
 auto choose=[&] {
 SELECTION
 return top;
 };
 assert(choose().idx==1); // A completed read must beat an older, unopened tag.
 logixPrefetch.clear();
 assert(choose().idx==0); // With no result ready, ordinary due order is preserved.
}
'''.replace('SELECTION',selection)
with tempfile.TemporaryDirectory() as directory:
    cpp=Path(directory)/'ready.cpp';exe=Path(directory)/'ready'
    cpp.write_text(program)
    subprocess.run(['g++','-std=c++17',str(cpp),'-o',str(exe)],check=True)
    subprocess.run([str(exe)],check=True)
print('Completed-read priority over overdue startup work passed.')
