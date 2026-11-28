# Replay Coverage Report

- 归档: E:\WorkProjects\webbuild-kb\workspace\bishuxiezuo\archive-bishu（临时副本） | serve: v2.3 | 端口: 8795
- 时间: 2026-11-28T08:58:55.066Z
- 场景: 10/10 通过 | unmatched 2 | 歧义拒绝 1 | 宽松回退/截断留痕 7

| 场景 | 内容 | 结果 | unmatched+歧义 | 回退留痕 | 失败断言 |
|------|------|------|----------------|----------|----------|
| S01 入口与控制台初始化 | page | PASS | 0 | 1 | - |
| S02 书架数据与书籍列表 | page | PASS | 0 | 1 | - |
| S03 世界观总览与维度详情 | page | PASS | 0 | 1 | - |
| S04 四步向导进入编辑 | page | PASS | 0 | 1 | - |
| S05 书架助手与会话创建 | page | PASS | 0 | 1 | - |
| E01 书架搜索实测行为（两本书） | page | PASS | 0 | 1 | - |
| E02 新书进书与铸造向导壳渲染（UI） | page | PASS | 0 | 1 | - |
| E03 角色列表与角色详情（只读） | api | PASS | 0 | 0 | - |
| S06 并发相同签名请求 FIFO 确定性 | api | PASS | 0 | 0 | - |
| S07 未录制与歧义请求诊断 | api | PASS | 3 | 0 | - |
