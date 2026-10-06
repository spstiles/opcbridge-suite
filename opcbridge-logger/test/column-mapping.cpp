#define main logger_service_main
#include "../opcbridge_logger.cpp"
#undef main
#include <cassert>

int main() {
    Job job;
    std::string error;
    assert(parse_job_columns(json::object(), job, error));
    std::vector<std::string> values(log_source_fields.size(), "NULL");
    values[1] = "123";
    values[7] = "42";
    const auto standard = log_insert_sql(nullptr, job, values);
    assert(standard.find("`value_numeric`") != std::string::npos);
    assert(parse_job_columns(json{{"field_map", {{"timestamp_ms", "sample_time"}, {"value_numeric", "reading"}}},
                                 {"static_fields", {{"line", 2}, {"enabled", true}, {"optional", nullptr}}}}, job = Job{}, error));
    const auto mapped = log_insert_sql(nullptr, job, values);
    assert(mapped == "INSERT INTO `tag_log` (`sample_time`,`reading`,`enabled`,`line`,`optional`) VALUES (123,42,1,2,NULL);");
    for (const auto& bad : std::vector<json>{
        {{"field_map", {{"unknown", "x"}}}},
        {{"field_map", {{"tag_name", "x"}, {"quality", "X"}}}},
        {{"field_map", {{"tag_name", "x`); DROP TABLE t;--"}}}},
        {{"field_map", json::object()}},
        {{"field_map", {{"quality", "x"}}}, {"static_fields", {{"X", 1}}}},
        {{"static_fields", {{"quality", 1}}}},
        {{"static_fields", {{"site", json::array({1})}}}}
    }) assert(!parse_job_columns(bad, job = Job{}, error));
}
