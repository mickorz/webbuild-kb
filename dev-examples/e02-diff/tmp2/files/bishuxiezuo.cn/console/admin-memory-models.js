{
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const text = (zh, en) => window.CLANG === 'en' ? en : zh;
  const copy = value => JSON.parse(JSON.stringify(value));
  const keyOf = node => JSON.stringify([node.node_id, node.model_ref, Object.entries(node.model_params).sort(([a], [b]) => a.localeCompare(b))]);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const labels = {
    retain: ['记忆写入', 'Memory retention'],
    consolidation: ['观察归纳', 'Observation consolidation'],
    reflect: ['记忆推理', 'Memory reflection']
  };
  const purposes = {
    retain: ['接收新记忆时提取事实', 'Extract facts when new memories arrive'],
    consolidation: ['后台合并事实、生成观察', 'Consolidate facts into observations in the background'],
    reflect: ['需要综合记忆回答时调用', 'Reason over memory when reflection is requested']
  };
  const fields = [['temperature', '温度', 'Temperature', 0, 2, 0.1], ['top_p', '采样范围', 'Top P', 0.01, 1, 0.01], ['max_tokens', '输出上限', 'Output token limit', 128, 65536, 1]];
  function MemoryModelsPanel() {
    const [saved, setSaved] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [runtime, setRuntime] = useState(null);
    const [probes, setProbes] = useState({});
    const [busy, setBusy] = useState('load');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const mounted = useRef(false);
    const active = useRef(false);
    const load = async () => {
      if (active.current) return;
      active.current = true;
      setBusy('load');
      setError('');
      try {
        const result = await window.LF_API.adminMemoryModels();
        if (!mounted.current) return;
        setSaved(result);
        setNodes(copy(result.nodes));
        setRuntime(copy(result.runtime));
        setProbes({});
        setNotice('');
      } catch (err) {
        if (mounted.current) setError(err.message || text('记忆模型配置读取失败', 'Could not load memory models'));
      } finally {
        active.current = false;
        if (mounted.current) setBusy('');
      }
    };
    useEffect(() => {
      mounted.current = true;
      load();
      return () => {
        mounted.current = false;
      };
    }, []);
    const run = async (name, action) => {
      if (active.current) return;
      active.current = true;
      setBusy(name);
      setError('');
      setNotice('');
      try {
        await action();
      } catch (err) {
        if (mounted.current) setError(err.message || text('操作失败，请重试', 'Request failed; try again'));
      } finally {
        active.current = false;
        if (mounted.current) setBusy('');
      }
    };
    const probe = node => run('probe:' + node.node_id, async () => {
      const result = await window.LF_API.adminProbeMemoryModel({
        node_id: node.node_id,
        model_ref: node.model_ref,
        model_params: node.model_params
      });
      if (mounted.current) setProbes(prev => ({
        ...prev,
        [keyOf(node)]: result
      }));
    });
    const saveNode = node => run('save:' + node.node_id, async () => {
      const result = await window.LF_API.adminUpdateMemoryModels({
        expected_revision: saved.revision,
        nodes: [{
          node_id: node.node_id,
          model_ref: node.model_ref,
          model_params: node.model_params,
          probe_receipt: probes[keyOf(node)] && probes[keyOf(node)].receipt
        }]
      });
      if (!mounted.current) return;
      setSaved(prev => ({
        ...prev,
        ...result
      }));
      setNotice(text('已保存，接入统一入口后的新调用使用此配置。', 'Saved. New calls through the relay use this configuration.'));
    });
    const saveRuntime = () => run('runtime', async () => {
      const result = await window.LF_API.adminUpdateMemoryModels({
        expected_revision: saved.revision,
        runtime
      });
      if (!mounted.current) return;
      setSaved(prev => ({
        ...prev,
        ...result
      }));
      setRuntime(copy(result.runtime));
      setNotice(text('配置已保存，待部署并核验运行状态。', 'Configuration saved; deployment and runtime verification are pending.'));
    });
    const download = () => run('download', async () => {
      const result = await window.LF_API.adminMemoryModelDeployment();
      if (!mounted.current) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], {
        type: 'application/json'
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'memory-model-deployment.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
    const edit = (node, changes) => {
      setNodes(prev => prev.map(value => value.node_id === node.node_id ? {
        ...value,
        ...changes
      } : value));
      setNotice('');
    };
    if (!saved) return /*#__PURE__*/React.createElement("section", {
      className: "adm-model-workflow adm-memory-models"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, text('Hindsight 记忆服务', 'Hindsight memory service'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node",
      role: error ? 'alert' : 'status'
    }, error || text('正在读取配置…', 'Loading configuration…'), error && /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      onClick: load
    }, text('重试', 'Retry'))));
    const dirtyRuntime = !same(runtime, saved.runtime);
    const dirty = dirtyRuntime || nodes.some(node => keyOf(node) !== keyOf(saved.nodes.find(n => n.node_id === node.node_id)));
    const status = {
      unverified: ['尚未核验运行状态', 'Runtime not verified'],
      applied: ['与上次核验的运行配置一致', 'Matches the last verified runtime'],
      migration_required: ['待完成向量迁移后部署', 'Embedding migration required before deployment'],
      restart_required: ['待重启记忆服务后核验', 'Restart and runtime verification required']
    }[saved.runtime_status] || ['运行状态未知', 'Runtime status unknown'];
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-model-workflow adm-memory-models",
      "aria-label": text('Hindsight 记忆模型', 'Hindsight memory models')
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, text('Hindsight 记忆服务', 'Hindsight memory service')), /*#__PURE__*/React.createElement("p", null, text('管理写入、观察归纳与记忆推理。普通召回使用下方的向量和重排模型。', 'Manage retention, consolidation and reflection. Ordinary recall uses the embedding and reranker models below.'))), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      disabled: !!busy || dirty,
      onClick: load
    }, text('刷新', 'Refresh'))), error && /*#__PURE__*/React.createElement("div", {
      className: "adm-model-error",
      role: "alert"
    }, error, /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      disabled: !!busy,
      onClick: load
    }, text('放弃草稿并重新读取', 'Discard drafts and reload'))), notice && /*#__PURE__*/React.createElement("div", {
      className: "adm-memory-message",
      role: "status"
    }, notice), !saved.relay_configured && /*#__PURE__*/React.createElement("div", {
      className: "adm-model-notice"
    }, text('统一模型入口尚未接通，暂不能验证大模型。', 'The model relay is not connected; LLM verification is unavailable.')), saved.catalog_status === 'unavailable' && /*#__PURE__*/React.createElement("div", {
      className: "adm-model-notice"
    }, text('可用模型读取失败，请刷新后重试。', 'Available models could not be loaded. Refresh to retry.')), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node-list"
    }, nodes.map(node => {
      const baseline = saved.nodes.find(n => n.node_id === node.node_id);
      const changed = keyOf(node) !== keyOf(baseline);
      const tested = probes[keyOf(node)] && probes[keyOf(node)].receipt;
      const options = Array.from(new Set([node.model_ref, ...(saved.available_models || [])]));
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-model-node",
        key: node.node_id,
        "data-memory-node": node.node_id
      }, /*#__PURE__*/React.createElement("div", {
        className: "adm-model-node-main"
      }, /*#__PURE__*/React.createElement("div", {
        className: "adm-model-node-meta"
      }, /*#__PURE__*/React.createElement("b", null, text(...labels[node.node_id])), /*#__PURE__*/React.createElement("span", null, text(...purposes[node.node_id]))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, text('模型', 'Model')), /*#__PURE__*/React.createElement("select", {
        "aria-label": text(...labels[node.node_id]),
        value: node.model_ref,
        disabled: !!busy || saved.catalog_status !== 'ready',
        onChange: event => edit(node, {
          model_ref: event.target.value
        })
      }, options.map(value => /*#__PURE__*/React.createElement("option", {
        key: value,
        value: value
      }, value.replace(/^new-api:/, ''))))), /*#__PURE__*/React.createElement("div", {
        className: "adm-model-probe"
      }, /*#__PURE__*/React.createElement("button", {
        className: "c-btn sm",
        disabled: !!busy || !saved.relay_configured || saved.catalog_status !== 'ready',
        onClick: () => probe(node)
      }, busy === 'probe:' + node.node_id ? text('检测中…', 'Checking…') : text('检测', 'Check')), /*#__PURE__*/React.createElement("button", {
        className: "c-btn sm",
        disabled: !!busy || !(changed || !baseline.verified) || !tested,
        onClick: () => saveNode(node)
      }, text('保存', 'Save')), /*#__PURE__*/React.createElement("span", {
        className: tested || !changed && baseline.verified ? 'ok' : ''
      }, tested ? text('检测通过', 'Check passed') : !changed && baseline.verified ? text('已验证', 'Verified') : text('待验证', 'Verification required')))), /*#__PURE__*/React.createElement("details", {
        className: "adm-model-params"
      }, /*#__PURE__*/React.createElement("summary", null, text('参数', 'Parameters')), /*#__PURE__*/React.createElement("div", null, fields.map(([name, zh, en, min, max, step]) => /*#__PURE__*/React.createElement("label", {
        key: name
      }, /*#__PURE__*/React.createElement("span", null, text(zh, en)), /*#__PURE__*/React.createElement("input", {
        type: "number",
        "aria-label": node.node_id + ' ' + name,
        min: min,
        max: max,
        step: step,
        placeholder: text('默认', 'Default'),
        disabled: !!busy,
        value: node.model_params[name] == null ? '' : node.model_params[name],
        onChange: event => {
          const params = {
            ...node.model_params
          };
          if (event.target.value === '') delete params[name];else params[name] = Number(event.target.value);
          edit(node, {
            model_params: params
          });
        }
      }))))));
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node adm-memory-runtime"
    }, /*#__PURE__*/React.createElement("h3", null, text('召回模型', 'Recall models')), /*#__PURE__*/React.createElement("div", {
      className: "adm-memory-runtime-fields"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, text('向量模型（本地）', 'Embedding model (local)')), /*#__PURE__*/React.createElement("input", {
      "aria-label": text('向量模型', 'Embedding model'),
      value: runtime.embeddings.model,
      disabled: !!busy,
      onChange: event => {
        setRuntime({
          ...runtime,
          embeddings: {
            ...runtime.embeddings,
            model: event.target.value
          }
        });
        setNotice('');
      }
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, text('向量维度', 'Embedding dimensions')), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "8192",
      "aria-label": text('向量维度', 'Embedding dimensions'),
      value: runtime.embeddings.dimensions,
      disabled: !!busy,
      onChange: event => {
        setRuntime({
          ...runtime,
          embeddings: {
            ...runtime.embeddings,
            dimensions: Number(event.target.value)
          }
        });
        setNotice('');
      }
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, text('重排模型（本地）', 'Reranker model (local)')), /*#__PURE__*/React.createElement("input", {
      "aria-label": text('重排模型', 'Reranker model'),
      value: runtime.reranker.model,
      disabled: !!busy,
      onChange: event => {
        setRuntime({
          ...runtime,
          reranker: {
            ...runtime.reranker,
            model: event.target.value
          }
        });
        setNotice('');
      }
    }))), /*#__PURE__*/React.createElement("p", null, text('保存后需部署并重启；更换向量模型或维度前，必须完成存量记忆的向量迁移。', 'Deploy and restart after saving. Changing embedding identity or dimensions requires migration of existing memory vectors first.')), /*#__PURE__*/React.createElement("div", {
      className: "adm-memory-runtime-status",
      role: "status"
    }, /*#__PURE__*/React.createElement("b", null, text(...status)), saved.applied_runtime && /*#__PURE__*/React.createElement("span", null, text('上次核验', 'Last verified'), ": ", saved.applied_runtime.embeddings.model, " \xB7 ", saved.applied_runtime.embeddings.dimensions, " / ", saved.applied_runtime.reranker.model, saved.runtime_observed_at && /*#__PURE__*/React.createElement("time", {
      dateTime: saved.runtime_observed_at
    }, " \xB7 ", new Date(saved.runtime_observed_at).toLocaleString()))), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      disabled: !dirtyRuntime || !!busy || !runtime.embeddings.model.trim() || !runtime.reranker.model.trim() || !Number.isInteger(runtime.embeddings.dimensions) || runtime.embeddings.dimensions < 1 || runtime.embeddings.dimensions > 8192,
      onClick: saveRuntime
    }, text('保存召回配置', 'Save recall configuration')), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      disabled: !!busy || dirty || !saved.relay_configured || saved.revision === 0,
      onClick: download
    }, text('下载部署配置', 'Download deployment configuration')))));
  }
  window.AdminMemoryModelsPanel = MemoryModelsPanel;
})();
}
