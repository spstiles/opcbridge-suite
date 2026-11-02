CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -pthread -I../opcbridge
LDFLAGS = -lcurl -lmysqlclient -pthread

ifneq ($(wildcard /usr/include/sql.h),)
CXXFLAGS += -DOPCBRIDGE_HAVE_ODBC
LDFLAGS += -lodbc
endif

TARGET = opcbridge-logger
SRCS = opcbridge_logger.cpp

SUITE_VERSION := $(shell (cat ../VERSION 2>/dev/null || echo dev) | tr -d '\r\n')
COMPONENT_VERSION := $(shell (cat VERSION 2>/dev/null || echo dev) | tr -d '\r\n')

all: $(TARGET)

$(TARGET): $(SRCS) VERSION ../VERSION ../opcbridge/consumer_demand_client.h
	$(CXX) $(CXXFLAGS) -DOPCBRIDGE_SUITE_VERSION=\"$(SUITE_VERSION)\" -DOPCBRIDGE_LOGGER_VERSION=\"$(COMPONENT_VERSION)\" -o $(TARGET) $(SRCS) $(LDFLAGS)

clean:
	rm -f $(TARGET)

.PHONY: test
test:
	$(CXX) $(CXXFLAGS) -o /tmp/opcbridge-logger-column-mapping-test test/column-mapping.cpp $(LDFLAGS)
	/tmp/opcbridge-logger-column-mapping-test
	$(CXX) $(CXXFLAGS) -o /tmp/opcbridge-logger-demand-test test/demand.cpp $(LDFLAGS)
	/tmp/opcbridge-logger-demand-test

.PHONY: test-freshness
test-freshness: $(TARGET)
	$(CXX) $(CXXFLAGS) -o /tmp/opcbridge-logger-freshness-test test/freshness.cpp $(LDFLAGS)
	python3 ../opcbridge/scripts/test-logger-freshness.py --helper /tmp/opcbridge-logger-freshness-test --logger-binary "$(CURDIR)/$(TARGET)"
