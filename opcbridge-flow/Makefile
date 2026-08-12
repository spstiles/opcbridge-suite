CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -pthread -I../opcbridge
LDFLAGS = -lcurl -lmosquitto -pthread

TARGET = opcbridge-flow
SRCS = opcbridge_flow.cpp

SUITE_VERSION := $(shell (cat ../VERSION 2>/dev/null || echo dev) | tr -d '\r\n')
COMPONENT_VERSION := $(shell (cat VERSION 2>/dev/null || echo dev) | tr -d '\r\n')

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) -DOPCBRIDGE_SUITE_VERSION=\"$(SUITE_VERSION)\" -DOPCBRIDGE_FLOW_VERSION=\"$(COMPONENT_VERSION)\" -o $(TARGET) $(SRCS) $(LDFLAGS)

clean:
	rm -f $(TARGET)
