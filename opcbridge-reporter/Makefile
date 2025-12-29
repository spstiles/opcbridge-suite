CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
LDFLAGS = -lcurl -lmysqlclient

TARGET = opcbridge-reporter
SRCS = opcbridge_reporter.cpp

SUITE_VERSION := $(shell (cat ../VERSION 2>/dev/null || echo dev) | tr -d '\r\n')
COMPONENT_VERSION := $(shell (cat VERSION 2>/dev/null || echo dev) | tr -d '\r\n')

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) -DOPCBRIDGE_SUITE_VERSION=\"$(SUITE_VERSION)\" -DOPCBRIDGE_REPORTER_VERSION=\"$(COMPONENT_VERSION)\" -o $(TARGET) $(SRCS) $(LDFLAGS)

clean:
	rm -f $(TARGET)
