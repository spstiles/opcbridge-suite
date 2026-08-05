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

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) -DOPCBRIDGE_SUITE_VERSION=\"$(SUITE_VERSION)\" -DOPCBRIDGE_LOGGER_VERSION=\"$(COMPONENT_VERSION)\" -o $(TARGET) $(SRCS) $(LDFLAGS)

clean:
	rm -f $(TARGET)
