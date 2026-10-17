"""Explicit deterministic mock planner; never a fallback for a real model."""

import re

from prodops.domain.execution import ConversationTurn, Observation, ToolRequest


class MockDiagnosticAgent:
    def plan(self, content: str, context: tuple[ConversationTurn, ...] = ()) -> tuple[ToolRequest, ...]:
        patterns = ((r"相机|camera|cam-\d|无图像|掉线", "camera_offline"),
                    (r"ocr|识别|成功率|准确率", "ocr_quality_drop"),
                    (r"kafka|堆积|lag|消费", "kafka_backlog"),
                    (r"推理|inference|延迟|latency|p99|慢", "inference_latency_high"))
        matched = [scenario for pattern, scenario in patterns if re.search(pattern, content, re.IGNORECASE)]
        if not matched and content.strip().lower() in ("继续", "继续排查", "再查一次", "请继续排查", "continue", "again"):
            for turn in reversed(context):
                if turn.role == "user":
                    matched = [scenario for pattern, scenario in patterns if re.search(pattern, turn.content, re.IGNORECASE)]
                    if matched:
                        break
        if len(matched) != 1:
            return ()
        return tuple(ToolRequest(name, matched[0]) for name in ("mock.read_metrics", "mock.read_logs", "mock.read_runbook"))

    def answer(self, observations: tuple[Observation, ...]) -> str:
        if not observations:
            return "【模拟排查】请明确选择相机掉线、OCR质量下降、Kafka堆积或推理延迟中的一种问题。本轮没有采集证据。"
        evidence = "\n".join(f"- {item.summary}（{item.source}）" for item in observations)
        return f"【模拟排查】以下结论仅来自模拟夹具：\n{evidence}\n本轮只读诊断完成；未执行设备处置，故障恢复情况未知。"
