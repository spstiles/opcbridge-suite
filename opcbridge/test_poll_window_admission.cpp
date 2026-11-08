#include "poll_window_admission.h"
#include <cassert>
#include <set>
int main() {
    const auto now=std::chrono::steady_clock::now();
    assert(poll_window_paused(100,100,true,now,now,1000));
    assert(!poll_window_paused(99,100,true,now,now,1000));
    assert(poll_window_paused(1,100,true,now,now+std::chrono::seconds(1),1000));
    assert(!poll_window_paused(0,100,false,now,now+std::chrono::seconds(2),1000));
    size_t cursor=0,checks=0;
    const auto none=poll_window_candidates(5,3000,0,cursor,[&](size_t){++checks;return true;});
    assert(none.empty() && checks==0 && cursor==0);
    auto first=poll_window_candidates(5,3000,4,cursor,[&](size_t){++checks;return true;});
    assert(first==std::vector<size_t>({5,0,1,2}));
    auto second=poll_window_candidates(5,3000,4,cursor,[](size_t){return true;});
    assert(second==std::vector<size_t>({5,3,4,6}));
    checks=0;
    const auto sparse=poll_window_candidates(5,3000,100,cursor,[&](size_t i){++checks;return i==2999;});
    assert(checks<=3000 && sparse==std::vector<size_t>({5,2999}));
    assert(std::set<size_t>(second.begin(),second.end()).size()==second.size());
}
