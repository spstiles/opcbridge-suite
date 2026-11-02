#define main logger_service_main
#include "../opcbridge_logger.cpp"
#undef main
#include <cassert>

int main(int argc, char **argv) {
    assert(argc == 2);
    curl_global_init(CURL_GLOBAL_DEFAULT);
    ServiceConfig svc;
    Job parsed; std::string error;
    assert(parse_job_freshness(json::object(), parsed, error));
    assert(!parsed.require_fresh_read && parsed.fresh_timeout_ms == 1000);
    for (const auto &bad : std::vector<json>{{{"require_fresh_read", "yes"}},
            {{"fresh_timeout_ms", 5001}}, {{"fresh_max_age_ms", 0.5}}, {{"fresh_max_age_ms", 4294967296LL}}})
        assert(!parse_job_freshness(bad, parsed, error));
    auto check = [&](const std::string &mode, Job job, bool success, size_t count) {
        DbConfig db; db.opcbridge_base_url = std::string(argv[1]) + "/" + mode + "/";
        json samples = {"old"}; error.clear();
        assert(fetch_verified_job_tags(job, db, svc, samples, error) == success);
        assert(samples.size() == count);
        if (!success) assert(!error.empty() && samples.empty());
    };
    Job exact; exact.tag_keys = {make_tag_key("PLC", "Tag:WithColon"), make_tag_key("PLC", "Other")};
    check("good", exact, true, 2);
    for (const auto &mode : {"timeout", "old", "wrong", "duplicate", "bad", "null", "timestamp", "unverified", "omitted"})
        check(mode, exact, false, 0);
    Job large;
    for (int i=0;i<65;i++) large.tag_keys.insert(make_tag_key("PLC", "Tag" + std::to_string(i)));
    check("good", large, true, 65);
    check("second_fails", large, false, 0);
    Job pattern; pattern.tag_name_globs_by_conn["PLC"] = {"Tag*"};
    check("good", pattern, true, 3);
    pattern.tag_name_globs_by_conn["PLC"] = {"Missing*"};
    check("good", pattern, false, 0);
    Job all; all.log_all = true;
    check("good", all, true, 4);
    // Exact selections remain required even when discovery omits a name.
    all.tag_keys.insert(make_tag_key("PLC", "Tag:WithColon"));
    check("good", all, true, 5);
    curl_global_cleanup();
}
