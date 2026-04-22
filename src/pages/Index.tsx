import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CircleCheck as CheckCircle2, ChevronRight, ClipboardCheck, Download, CreditCard as Edit3, Eye, Image, Landmark, Plus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

declare global {
  interface Window {
    electronAPI?: {
      loadData: () => Promise<Agency[] | null>;
      saveData: (data: Agency[]) => Promise<boolean>;
    };
  }
}

type Service = { id: string; name: string; executed: boolean; evidence: boolean; responsible: string; notes: string; imageUrl?: string };
type Environment = { id: string; name: string; services: Service[] };
type Agency = { id: string; name: string; code: string; environments: Environment[] };
type Level = "agencies" | "environments";

const initialData: Agency[] = [
  {
    id: "ag-1",
    name: "Agência Centro Operacional",
    code: "0018",
    environments: [
      {
        id: "env-1",
        name: "Autoatendimento",
        services: [
          { id: "srv-1", name: "Verificação de ATM e dispensadores", executed: true, evidence: true, responsible: "Marina Costa", notes: "Sem anomalias." },
          { id: "srv-2", name: "Limpeza técnica dos terminais", executed: false, evidence: false, responsible: "", notes: "Agendar janela fora do expediente." },
        ],
      },
      {
        id: "env-2",
        name: "Tesouraria",
        services: [{ id: "srv-3", name: "Inspeção de fechaduras e sensores", executed: true, evidence: true, responsible: "Rafael Lima", notes: "Sensor principal recalibrado." }],
      },
    ],
  },
  {
    id: "ag-2",
    name: "Agência Norte Empresarial",
    code: "0142",
    environments: [
      {
        id: "env-3",
        name: "Sala Técnica",
        services: [
          { id: "srv-4", name: "Teste de nobreak e quadro elétrico", executed: false, evidence: false, responsible: "", notes: "" },
          { id: "srv-5", name: "Validação de rack e rede", executed: true, evidence: true, responsible: "Bianca Alves", notes: "Patch panel etiquetado." },
        ],
      },
    ],
  },
];

const uid = () => crypto.randomUUID();
const completion = (services: Service[]) => (services.length ? Math.round((services.filter((service) => service.executed).length / services.length) * 100) : 0);
const agencyCompletion = (agency: Agency) => {
  const allServices = agency.environments.flatMap((environment) => environment.services);
  return completion(allServices);
};

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-progress-track" aria-label={`Progresso ${value}%`}>
    <div className="h-full rounded-full bg-success transition-all duration-500 ease-out" style={{ width: `${value}%` }} />
  </div>
);

const EmptyState = ({ title, action }: { title: string; action: string }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface/60 p-8 text-center">
    <ClipboardCheck className="mb-3 size-10 text-muted-foreground" />
    <p className="font-semibold text-foreground">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">Use o botão {action} para começar.</p>
  </div>
);

const Index = () => {
  const [agencies, setAgencies] = useState<Agency[]>(initialData);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ type: "agency" | "environment" | "service"; id: string } | null>(null);
  const [collapsedEnvironmentIds, setCollapsedEnvironmentIds] = useState<string[]>(initialData.flatMap((agency) => agency.environments.map((env) => env.id)));
  const [collapsedServiceIds, setCollapsedServiceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (window.electronAPI) {
        const saved = await window.electronAPI.loadData();
        if (saved) {
          setAgencies(saved);
          setCollapsedEnvironmentIds(saved.flatMap((agency) => agency.environments.map((env) => env.id)));
        }
      } else {
        const saved = localStorage.getItem("bank-maintenance-data");
        if (saved) {
          const data = JSON.parse(saved);
          setAgencies(data);
          setCollapsedEnvironmentIds(data.flatMap((agency: Agency) => agency.environments.map((env: Environment) => env.id)));
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (window.electronAPI) {
      window.electronAPI.saveData(agencies);
    } else {
      localStorage.setItem("bank-maintenance-data", JSON.stringify(agencies));
    }
  }, [agencies, isLoading]);

  const selectedAgency = useMemo(() => agencies.find((agency) => agency.id === selectedAgencyId) ?? null, [agencies, selectedAgencyId]);
  const level: Level = selectedAgency ? "environments" : "agencies";

  const updateAgency = (agencyId: string, updater: (agency: Agency) => Agency) => setAgencies((current) => current.map((agency) => (agency.id === agencyId ? updater(agency) : agency)));
  const updateEnvironment = (environmentId: string, updater: (environment: Environment) => Environment) => selectedAgencyId && updateAgency(selectedAgencyId, (agency) => ({ ...agency, environments: agency.environments.map((environment) => (environment.id === environmentId ? updater(environment) : environment)) }));
  const updateService = (environmentId: string, serviceId: string, patch: Partial<Service>) => updateEnvironment(environmentId, (environment) => ({ ...environment, services: environment.services.map((service) => (service.id === serviceId ? { ...service, ...patch } : service)) }));
  const collapseEnvironment = (environmentId: string) => setCollapsedEnvironmentIds((current) => (current.includes(environmentId) ? current : [...current, environmentId]));
  const expandEnvironment = (environmentId: string) => setCollapsedEnvironmentIds((current) => current.filter((id) => id !== environmentId));
  const collapseService = (serviceId: string) => setCollapsedServiceIds((current) => (current.includes(serviceId) ? current : [...current, serviceId]));
  const expandService = (serviceId: string) => setCollapsedServiceIds((current) => current.filter((id) => id !== serviceId));

  const exportData = () => {
    const dataStr = JSON.stringify(agencies, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `manutencao-bancaria-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as Agency[];
        setAgencies(imported);
        setCollapsedEnvironmentIds(imported.flatMap((agency) => agency.environments.map((env) => env.id)));
        setSelectedAgencyId(null);
      } catch {
        alert("Arquivo JSON inválido");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = (environmentId: string, serviceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      updateService(environmentId, serviceId, { imageUrl });
    };
    reader.readAsDataURL(file);
  };

  const downloadImage = (imageUrl: string, serviceName: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${serviceName.replace(/\s+/g, "-")}-evidencia.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ImagePreviewButton = ({ imageUrl, serviceName }: { imageUrl: string; serviceName: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground" aria-label="Visualizar imagem">
          <Eye className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" side="right">
        <div className="space-y-2">
          <img src={imageUrl} alt="Evidência" className="h-48 w-full rounded-sm object-cover" />
          <Button variant="outline" size="sm" className="w-full" onClick={() => downloadImage(imageUrl, serviceName)}>
            <Download className="size-4" /> Baixar imagem
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const addAgency = () => {
    const agency = { id: uid(), name: "Nova Agência", code: String(Math.floor(1000 + Math.random() * 9000)), environments: [] };
    setAgencies((current) => [...current, agency]);
    setSelectedAgencyId(null);
    setEditing({ type: "agency", id: agency.id });
  };

  const addEnvironment = () => {
    if (!selectedAgencyId) return;
    const environment = { id: uid(), name: "Novo Ambiente", services: [] };
    updateAgency(selectedAgencyId, (agency) => ({ ...agency, environments: [...agency.environments, environment] }));
    setEditing({ type: "environment", id: environment.id });
  };

  const addService = (environmentId: string) => {
    const service = { id: uid(), name: "Novo Serviço", executed: false, evidence: false, responsible: "", notes: "", imageUrl: "" };
    expandEnvironment(environmentId);
    expandService(service.id);
    updateEnvironment(environmentId, (environment) => ({ ...environment, services: [...environment.services, service] }));
    setEditing({ type: "service", id: service.id });
  };

  const removeAgency = (agencyId: string) => {
    setAgencies((current) => current.filter((agency) => agency.id !== agencyId));
    if (selectedAgencyId === agencyId) {
      setSelectedAgencyId(null);
    }
  };

  const removeEnvironment = (environmentId: string) => {
    if (!selectedAgencyId) return;
    updateAgency(selectedAgencyId, (agency) => ({ ...agency, environments: agency.environments.filter((environment) => environment.id !== environmentId) }));
  };

  const removeService = (environmentId: string, serviceId: string) => updateEnvironment(environmentId, (environment) => ({ ...environment, services: environment.services.filter((service) => service.id !== serviceId) }));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-gradient-soft">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-sm bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                <Landmark className="size-4" /> Rede bancária
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Manutenção preventiva e corretiva</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">Controle local por agência, ambiente e serviço com performance calculada em tempo real.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportData} className="transition-transform hover:-translate-y-0.5">
                <Download className="size-4" /> Exportar Dados (JSON)
              </Button>
              <input ref={fileInputRef} type="file" accept="application/json" onChange={importData} className="hidden" id="import-file" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="transition-transform hover:-translate-y-0.5">
                <Upload className="size-4" /> Importar Dados (JSON)
              </Button>
              <Button variant="command" onClick={level === "agencies" ? addAgency : addEnvironment} className="transition-transform hover:-translate-y-0.5">
                <Plus className="size-4" /> {level === "agencies" ? "Agência" : "Ambiente"}
              </Button>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <button className="rounded-sm px-2 py-1 hover:bg-surface hover:text-foreground" onClick={() => setSelectedAgencyId(null)}>Agências</button>
            {selectedAgency && <><ChevronRight className="size-4" /><span className="rounded-sm bg-surface px-2 py-1 text-foreground">{selectedAgency.name}</span></>}
          </nav>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        {level === "agencies" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {agencies.length === 0 && <div className="lg:col-span-2"><EmptyState title="Nenhuma agência cadastrada" action="+ Agência" /></div>}
            {agencies.map((agency) => {
              const progress = agencyCompletion(agency);
              return (
                <article key={agency.id} className="group animate-fade-slide rounded-md border border-border bg-panel p-5 shadow-panel transition-all hover:-translate-y-1 hover:border-primary/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 text-left">
                      <div className="mb-3 flex size-10 items-center justify-center rounded-sm bg-primary text-primary-foreground"><Building2 className="size-5" /></div>
                      {editing?.type === "agency" && editing.id === agency.id ? (
                        <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); setEditing(null); }} onClick={(event) => event.stopPropagation()}>
                          <Input value={agency.name} onChange={(event) => updateAgency(agency.id, (item) => ({ ...item, name: event.target.value }))} autoFocus />
                          <div className="flex gap-2">
                            <Input value={agency.code} onChange={(event) => updateAgency(agency.id, (item) => ({ ...item, code: event.target.value }))} aria-label="Código da agência" />
                            <Button type="submit" variant="success" size="icon" aria-label="Salvar agência"><Save className="size-4" /></Button>
                          </div>
                        </form>
                      ) : (
                        <button className="text-left" onClick={() => setSelectedAgencyId(agency.id)}><h2 className="truncate text-xl font-semibold text-panel-foreground">{agency.name}</h2><p className="text-sm text-muted-foreground">Código {agency.code} • {agency.environments.length} ambientes</p></button>
                      )}
                    </div>
                    <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => setEditing({ type: "agency", id: agency.id })} aria-label="Editar agência"><Edit3 className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeAgency(agency.id)} aria-label="Remover agência"><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-4">
                    <ProgressBar value={progress} />
                    <strong className="w-12 text-right text-lg text-success">{progress}%</strong>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                    <p className="font-semibold text-panel-foreground">Ambientes vinculados</p>
                    {agency.environments.length === 0 ? (
                      <p>Nenhum ambiente cadastrado.</p>
                    ) : agency.environments.map((environment) => {
                      const environmentProgress = completion(environment.services);
                      return (
                        <div key={environment.id} className="grid gap-1 rounded-sm bg-surface p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate font-semibold text-panel-foreground">{environment.name}</p>
                            <span className="shrink-0 text-xs font-semibold text-success">{environmentProgress}%</span>
                          </div>
                          <p>{environment.services.filter((service) => service.executed).length} de {environment.services.length} serviços executados</p>
                          <ProgressBar value={environmentProgress} />
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {level === "environments" && selectedAgency && (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {selectedAgency.environments.length === 0 && <div className="lg:col-span-3"><EmptyState title="Nenhum ambiente cadastrado" action="+ Ambiente" /></div>}
            {selectedAgency.environments.map((environment) => {
              const progress = completion(environment.services);
              const isCollapsed = collapsedEnvironmentIds.includes(environment.id);
              const executedCount = environment.services.filter((service) => service.executed).length;
              const evidenceCount = environment.services.filter((service) => service.evidence).length;
              return (
                <article key={environment.id} className="animate-fade-slide flex min-h-[280px] flex-col rounded-md border border-border bg-panel p-5 shadow-quiet transition-all hover:-translate-y-1 hover:border-primary/40" onDoubleClick={() => expandEnvironment(environment.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-left">
                      {editing?.type === "environment" && editing.id === environment.id ? (
                        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setEditing(null); }} onClick={(event) => event.stopPropagation()}>
                          <Input value={environment.name} onChange={(event) => updateEnvironment(environment.id, (item) => ({ ...item, name: event.target.value }))} autoFocus />
                          <Button type="submit" variant="success" size="icon" aria-label="Salvar ambiente"><Save className="size-4" /></Button>
                        </form>
                      ) : (
                        <h2 className="truncate text-lg font-semibold">{environment.name}</h2>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">{environment.services.length} serviços</p>
                    </div>
                    {!isCollapsed && (
                      <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => setEditing({ type: "environment", id: environment.id })} aria-label="Editar ambiente"><Edit3 className="size-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => removeEnvironment(environment.id)} aria-label="Remover ambiente"><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex-1 overflow-hidden">
                    {isCollapsed ? (
                      <div className="grid gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                        <p><span className="font-semibold text-panel-foreground">Resumo:</span> {executedCount} de {environment.services.length} serviços executados</p>
                        <p>{evidenceCount} com evidência fotográfica • {progress}% de conclusão</p>
                      </div>
                    ) : (
                      <div className="space-y-3 border-t border-border pt-4" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-panel-foreground">Serviços</p>
                          <Button variant="ghost" size="sm" onClick={() => addService(environment.id)} aria-label="Adicionar serviço"><Plus className="size-4" /> Serviço</Button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto pr-1">
                          {environment.services.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum serviço vinculado.</p>
                          ) : environment.services.map((service) => {
                            const isServiceCollapsed = collapsedServiceIds.includes(service.id);
                            return (
                              <div key={service.id} className="mb-3 rounded-sm bg-surface p-3 text-sm" onDoubleClick={() => expandService(service.id)}>
                                {isServiceCollapsed ? (
                                  <div className="grid gap-1 text-muted-foreground">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <p className="truncate font-semibold text-panel-foreground">{service.name}</p>
                                        {service.imageUrl && <ImagePreviewButton imageUrl={service.imageUrl} serviceName={service.name} />}
                                      </div>
                                      <span className="shrink-0 text-xs font-semibold">{service.executed ? "Executado" : "Não executado"}</span>
                                    </div>
                                    <p>Responsável: {service.responsible || "Não informado"} • Evidência: {service.evidence ? "Sim" : "Não"}</p>
                                    {service.notes && <p className="line-clamp-2">Observações: {service.notes}</p>}
                                  </div>
                                ) : (
                                  <div className="grid gap-3">
                                    <div>
                                      {editing?.type === "service" && editing.id === service.id ? <Input value={service.name} onChange={(event) => updateService(environment.id, service.id, { name: event.target.value })} onBlur={() => setEditing(null)} autoFocus /> : <button className="flex items-center gap-2 text-left font-semibold" onClick={() => setEditing({ type: "service", id: service.id })}>{service.executed && <CheckCircle2 className="size-4 animate-status-pulse text-success" />}{service.name}</button>}
                                    </div>
                                    <Select value={service.executed ? "executed" : "pending"} onValueChange={(value) => updateService(environment.id, service.id, { executed: value === "executed" })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="executed">Executado</SelectItem><SelectItem value="pending">Não Executado</SelectItem></SelectContent>
                                    </Select>
                                    <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3"><Checkbox checked={service.evidence} onCheckedChange={(checked) => updateService(environment.id, service.id, { evidence: Boolean(checked) })} /> Evidência</label>
                                    <Input placeholder="Responsável" value={service.responsible} onChange={(event) => updateService(environment.id, service.id, { responsible: event.target.value })} />
                                    <Textarea placeholder="Observações" value={service.notes} onChange={(event) => updateService(environment.id, service.id, { notes: event.target.value })} className="min-h-10" />
                                    <div className="space-y-2">
                                      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 transition-colors hover:bg-surface">
                                        <Image className="size-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Anexar imagem</span>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(environment.id, service.id, e)} className="hidden" />
                                      </label>
                                      {service.imageUrl && (
                                        <div className="flex items-center gap-2 rounded-md bg-success/10 p-2">
                                          <Image className="size-4 shrink-0 text-success" />
                                          <span className="flex-1 truncate text-xs text-muted-foreground">Imagem anexada</span>
                                          <Button variant="ghost" size="icon" className="size-6" onClick={() => downloadImage(service.imageUrl!, service.name)} aria-label="Baixar imagem">
                                            <Download className="size-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex justify-end gap-1">
                                      <Button variant="success" size="sm" onClick={() => { setEditing(null); collapseService(service.id); }}><Save className="size-4" /> Salvar</Button>
                                      <Button variant="ghost" size="icon" onClick={() => setEditing({ type: "service", id: service.id })} aria-label="Editar serviço"><Edit3 className="size-4" /></Button>
                                      <Button variant="ghost" size="icon" onClick={() => removeService(environment.id, service.id)} aria-label="Remover serviço"><Trash2 className="size-4 text-destructive" /></Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto flex items-center gap-4 border-t border-border pt-4"><ProgressBar value={progress} /><strong className="w-12 text-right text-lg text-success">{progress}%</strong></div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
