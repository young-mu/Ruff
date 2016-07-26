#include <android/log.h>

#define TAG "RuffNative"
#define LOGV(...) ((void)__android_log_print(ANDROID_LOG_VERBOSE, TAG, __VA_ARGS__))
#define LOGD(...) ((void)__android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__))
#define LOGI(...) ((void)__android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__))
#define LOGW(...) ((void)__android_log_print(ANDROID_LOG_WARNING, TAG, __VA_ARGS__))
#define LOGE(...) ((void)__android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__))
