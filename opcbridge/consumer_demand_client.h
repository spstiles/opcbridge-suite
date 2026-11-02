#pragma once
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <functional>
#include <iomanip>
#include <map>
#include <mutex>
#include <random>
#include <sstream>
#include <string>
#include <thread>

inline std::string consumer_demand_base_url(std::string url) {
    while (!url.empty() && url.back() == '/') url.pop_back();
    return url;
}

// Dedicated heartbeat: long jobs must not block renewal. The caller initializes
// libcurl and stops this client before curl_global_cleanup and its config teardown.
class ConsumerDemandClient {
public:
    using Scopes = std::map<std::string, nlohmann::json>;
    using Clock = std::chrono::steady_clock;
    ~ConsumerDemandClient() { stop(); }
    void start(std::string owner, std::function<Scopes()> provider) {
        owner_ = std::move(owner);
        std::random_device random;
        std::ostringstream id;
        for (int i = 0; i < 4; ++i) id << std::hex << std::setw(8) << std::setfill('0') << random();
        client_ = id.str();
        stop_ = false;
        worker_ = std::thread([this, provider = std::move(provider)] {
            struct Sent { nlohmann::json scope; Clock::time_point next; };
            std::map<std::string, Sent> sent;
            while (!stop_) {
                try {
                    const auto desired = provider();
                    for (auto it = sent.begin(); it != sent.end();) {
                        if (!desired.count(it->first)) { post(it->first, {}, true); it = sent.erase(it); }
                        else ++it;
                    }
                    for (const auto &scope : desired) {
                        if (stop_) break;
                        const auto now = Clock::now();
                        auto found = sent.find(scope.first);
                        if (found == sent.end() || found->second.scope != scope.second || now >= found->second.next) {
                            post(scope.first, scope.second, false);
                            sent[scope.first] = {scope.second, now + std::chrono::seconds(10)};
                        }
                    }
                } catch (const std::exception &) {
                    ++provider_errors_;
                    // Preserve registrations until lease expiry if the provider fails.
                }
                std::unique_lock<std::mutex> lock(mutex_);
                cv_.wait_for(lock, std::chrono::seconds(1), [this] { return stop_.load(); });
            }
            for (const auto &entry : sent) post(entry.first, {}, true);
        });
    }
    nlohmann::json status() const {
        return {{"running", !stop_.load()}, {"provider_errors", provider_errors_.load()},
                {"request_errors", request_errors_.load()}, {"successful_requests", successful_requests_.load()}};
    }
    void stop() {
        stop_ = true;
        cv_.notify_all();
        if (worker_.joinable()) worker_.join();
    }
private:
    static size_t discard(char *, size_t size, size_t count, void *) { return size * count; }
    void post(const std::string &base, nlohmann::json scope, bool release) {
        if (!scope.is_object()) scope = nlohmann::json::object();
        scope["client_id"] = client_;
        scope["owner"] = owner_;
        const auto body = scope.dump();
        const auto url = base + (release ? "/polling/demand/release" : "/polling/demand/register");
        CURL *curl = curl_easy_init();
        if (!curl) { ++request_errors_; return; }
        auto *headers = curl_slist_append(nullptr, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, static_cast<long>(body.size()));
        curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, 1000L);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 2000L);
        curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, discard);
        const auto result = curl_easy_perform(curl);
        long status = 0;
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
        if (result == CURLE_OK && status >= 200 && status < 300) ++successful_requests_;
        else ++request_errors_;
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    std::string owner_, client_;
    std::atomic<bool> stop_{true};
    std::atomic<size_t> provider_errors_{0}, request_errors_{0}, successful_requests_{0};
    std::thread worker_;
    std::mutex mutex_;
    std::condition_variable cv_;
};
