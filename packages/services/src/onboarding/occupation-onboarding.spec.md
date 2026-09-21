# 职业引导自动弹出

## 行为

职业引导（OccupationOnboarding）只对真正的首次使用自动弹出。关闭必须落盘，重启不再自动出现。设置里手动打开不受此限制。

```text
启动
  → IOnboardingRecordService.shouldOnboard（唯一自动弹出判定）
        │
        ├─ 当前身份已有 onboarding-record 条目 → 不自动弹
        ├─ settings.onboardingOccupation 已有值（老用户/已答过） → 不自动弹
        └─ 否则自动弹
关闭 / Esc
  → dismissAutoOnboarding
        │
        ├─ 已有条目 → 空操作
        └─ 否则写入跳过形态记录（各选项为 null）
              不改 settings 的职业/模式/偏好
设置「打开引导」
  → 只走 UI requested，不经过 shouldOnboard
```

- `shouldOnboard` 是自动弹出的唯一判定；UI 不另做第二套「是否老用户」写入
- 完成或跳过整份向导仍走 `appendRecord` + 写 settings，语义不变
- 关闭不是完成向导：不把职业写成 `other`，只记「这人已经看过并关掉了」

## 所有者

`IOnboardingRecordService` 拥有自动弹出判定和关闭落盘。`OccupationOnboarding` 只发送关闭命令并隐藏本次界面。

## 验收

- 全新安装、无记录且 settings 无职业：启动自动弹出
- settings 已有 `onboardingOccupation`：启动不自动弹，即便还没有 record
- 当前身份已有 record：启动不自动弹
- 自动弹出后点关闭或 Esc：写入 record，重启不再自动弹；settings 职业不被改成 other
- 设置里手动打开再关闭：不覆盖已有 record
- 服务不可用时，UI 回退为「settings 没有职业才当需要引导」
