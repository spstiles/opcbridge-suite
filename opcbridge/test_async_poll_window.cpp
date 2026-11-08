#include "async_poll_window.h"
#include <cassert>
#include <map>
#include <vector>
int main() {
    constexpr int pending=1, timeout=-1;
    AsyncPollWindow window(2);
    auto now=AsyncPollWindow::Clock::now();
    std::map<size_t,int> statuses{{0,pending},{1,0},{2,0}};
    std::vector<size_t> submitted, captured, aborted;
    auto start=[&](size_t i) { submitted.push_back(i); return pending; };
    auto capture=[&](size_t i,int,auto) { captured.push_back(i); };
    auto abort=[&](size_t i) { aborted.push_back(i); };
    window.submit(0,1000,pending,timeout,start,capture,now);
    window.submit(1,1000,pending,timeout,start,capture,now);
    assert(window.submit(2,1000,pending,timeout,start,capture,now).requests==0);
    assert(window.submit(0,1000,pending,timeout,start,capture,now).requests==0);
    auto stats=window.service(pending,timeout,[&](size_t i){return statuses[i];},abort,capture,false,now);
    assert(captured==std::vector<size_t>{1});
    assert(window.contains(0) && !window.contains(1) && aborted.empty());
    // The slow request is still pending, but a freed slot admits another tag.
    assert(window.submit(2,1000,pending,timeout,start,capture,now).requests==1);
    window.service(pending,timeout,[&](size_t i){return statuses[i];},abort,capture,false,now);
    assert(captured==std::vector<size_t>({1,2}));
    stats=window.service(pending,timeout,[&](size_t i){return statuses[i];},abort,capture,false,now+std::chrono::milliseconds(999));
    assert(window.contains(0) && stats.timeouts==0);
    stats=window.service(pending,timeout,[&](size_t i){return statuses[i];},abort,capture,false,now+std::chrono::milliseconds(1000));
    assert(stats.timeouts==1 && stats.errors==1 && window.size()==0);
    assert(aborted==std::vector<size_t>{0});
    window.submit(0,1000,pending,timeout,start,capture,now);
    window.cancel(0,abort); // A suspended tag cannot produce a late completion.
    assert(window.size()==0);
    window.submit(0,1000,pending,timeout,start,capture,now);
    window.cancelAll(abort);
    assert(window.size()==0 && aborted.size()==3);
    window.submit(0,1000,pending,timeout,start,capture,now);
    stats=window.service(pending,timeout,[](size_t){return pending;},abort,capture,true,now);
    assert(stats.cancelled_requests==1 && window.size()==0);
    stats=window.submit(3,1000,pending,timeout,[](size_t){return -7;},capture,now);
    assert(stats.errors==1 && window.size()==0 && captured.back()==3);
}
