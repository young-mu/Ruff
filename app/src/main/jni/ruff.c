#include "_log.h"
#include <jni.h>
#include <errno.h>

void Java_com_young_ruff_MainActivity_mkfifo(JNIEnv *env, jobject obj, jstring jpath)
{
    const char *path = (*env)->GetStringUTFChars(env, jpath, 0);
    int ret = mkfifo(path, 0666);
    if (ret == 0) {
        LOGI("create named pipe [%s]", path);
    } else {
        LOGE("mkfifo failed with errno = %d", errno);
    }
}
