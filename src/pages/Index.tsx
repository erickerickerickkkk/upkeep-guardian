import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ChevronRight, ClipboardCheck, Edit3, Landmark, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Service = { id: string; name: string; executed: boolean; evidence: boolean; responsible: string; notes: string };
type Environment = { id: string; name: string; services: Service[] };
type Agency = { id: string; name: string; code: string; environments: Environment[] };
type Level = "agencies" | "environments" | "services";

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
  const [agencies, setAgencies] = useState<Agency[]>(() => {
    const saved = localStorage.getItem("bank-maintenance-data");
    return saved ? JSON.parse(saved) : initialData;
  });
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ type: "agency" | "environment" | "service"; id: string } | null>(null);

  useEffect(() => {
    localStorage.setItem("bank-maintenance-data", JSON.stringify(agencies));
  }, [agencies]);

  const selectedAgency = useMemo(() => agencies.find((agency) => agency.id === selectedAgencyId) ?? null, [agencies, selectedAgencyId]);
  const selectedEnvironment = useMemo(() => selectedAgency?.environments.find((environment) => environment.id === selectedEnvironmentId) ?? null, [selectedAgency, selectedEnvironmentId]);
  const level: Level = selectedEnvironment ? "services" : selectedAgency ? "environments" : "agencies";

  const updateAgency = (agencyId: string, updater: (agency: Agency) => Agency) => setAgencies((current) => current.map((agency) => (agency.id === agencyId ? updater(agency) : agency)));
  const updateEnvironment = (environmentId: string, updater: (environment: Environment) => Environment) => selectedAgencyId && updateAgency(selectedAgencyId, (agency) => ({ ...agency, environments: agency.environments.map((environment) => (environment.id === environmentId ? updater(environment) : environment)) }));
  const updateService = (serviceId: string, patch: Partial<Service>) => selectedEnvironmentId && updateEnvironment(selectedEnvironmentId, (environment) => ({ ...environment, services: environment.services.map((service) => (service.id === serviceId ? { ...service, ...patch } : service)) }));

  const addAgency = () => {
    const agency = { id: uid(), name: "Nova Agência", code: String(Math.floor(1000 + Math.random() * 9000)), environments: [] };
    setAgencies((current) => [...current, agency]);
    setSelectedAgencyId(null);
    setSelectedEnvironmentId(null);
    setEditing({ type: "agency", id: agency.id });
  };

  const addEnvironment = () => {
    if (!selectedAgencyId) return;
    const environment = { id: uid(), name: "Novo Ambiente", services: [] };
    updateAgency(selectedAgencyId, (agency) => ({ ...agency, environments: [...agency.environments, environment] }));
    setSelectedEnvironmentId(null);
    setEditing({ type: "environment", id: environment.id });
  };

  const addService = () => {
    if (!selectedEnvironmentId) return;
    const service = { id: uid(), name: "Novo Serviço", executed: false, evidence: false, responsible: "", notes: "" };
    updateEnvironment(selectedEnvironmentId, (environment) => ({ ...environment, services: [...environment.services, service] }));
    setEditing({ type: "service", id: service.id });
  };

  const removeAgency = (agencyId: string) => {
    setAgencies((current) => current.filter((agency) => agency.id !== agencyId));
    if (selectedAgencyId === agencyId) {
      setSelectedAgencyId(null);
      setSelectedEnvironmentId(null);
    }
  };

  const removeEnvironment = (environmentId: string) => {
    if (!selectedAgencyId) return;
    updateAgency(selectedAgencyId, (agency) => ({ ...agency, environments: agency.environments.filter((environment) => environment.id !== environmentId) }));
    if (selectedEnvironmentId === environmentId) setSelectedEnvironmentId(null);
  };

  const removeService = (serviceId: string) => selectedEnvironmentId && updateEnvironment(selectedEnvironmentId, (environment) => ({ ...environment, services: environment.services.filter((service) => service.id !== serviceId) }));

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
            <Button variant="command" onClick={level === "agencies" ? addAgency : level === "environments" ? addEnvironment : addService} className="transition-transform hover:-translate-y-0.5">
              <Plus className="size-4" /> {level === "agencies" ? "Agência" : level === "environments" ? "Ambiente" : "Serviço"}
            </Button>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <button className="rounded-sm px-2 py-1 hover:bg-surface hover:text-foreground" onClick={() => { setSelectedAgencyId(null); setSelectedEnvironmentId(null); }}>Agências</button>
            {selectedAgency && <><ChevronRight className="size-4" /><button className="rounded-sm px-2 py-1 hover:bg-surface hover:text-foreground" onClick={() => setSelectedEnvironmentId(null)}>{selectedAgency.name}</button></>}
            {selectedEnvironment && <><ChevronRight className="size-4" /><span className="rounded-sm bg-surface px-2 py-1 text-foreground">{selectedEnvironment.name}</span></>}
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
                </article>
              );
            })}
          </div>
        )}

        {level === "environments" && selectedAgency && (
          <div className="grid gap-4 lg:grid-cols-3">
            {selectedAgency.environments.length === 0 && <div className="lg:col-span-3"><EmptyState title="Nenhum ambiente cadastrado" action="+ Ambiente" /></div>}
            {selectedAgency.environments.map((environment) => {
              const progress = completion(environment.services);
              return (
                <article key={environment.id} className="animate-fade-slide rounded-md border border-border bg-panel p-5 shadow-quiet transition-all hover:-translate-y-1 hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedEnvironmentId(environment.id)}>
                      {editing?.type === "environment" && editing.id === environment.id ? <Input value={environment.name} onChange={(event) => updateEnvironment(environment.id, (item) => ({ ...item, name: event.target.value }))} onBlur={() => setEditing(null)} autoFocus /> : <h2 className="truncate text-lg font-semibold">{environment.name}</h2>}
                      <p className="mt-1 text-sm text-muted-foreground">{environment.services.length} serviços</p>
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing({ type: "environment", id: environment.id })} aria-label="Editar ambiente"><Edit3 className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeEnvironment(environment.id)} aria-label="Remover ambiente"><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                  <div className="mt-5 flex items-center gap-4"><ProgressBar value={progress} /><strong className="w-12 text-right text-lg text-success">{progress}%</strong></div>
                </article>
              );
            })}
          </div>
        )}

        {level === "services" && selectedEnvironment && (
          <div className="overflow-hidden rounded-md border border-border bg-panel shadow-panel">
            {selectedEnvironment.services.length === 0 ? <EmptyState title="Nenhum serviço cadastrado" action="+ Serviço" /> : selectedEnvironment.services.map((service) => (
              <div key={service.id} className="grid gap-4 border-b border-border p-4 last:border-b-0 xl:grid-cols-[1.15fr_170px_130px_190px_1fr_88px] xl:items-start">
                <div>
                  {editing?.type === "service" && editing.id === service.id ? <Input value={service.name} onChange={(event) => updateService(service.id, { name: event.target.value })} onBlur={() => setEditing(null)} autoFocus /> : <button className="flex items-center gap-2 text-left font-semibold" onClick={() => setEditing({ type: "service", id: service.id })}>{service.executed && <CheckCircle2 className="size-4 animate-status-pulse text-success" />}{service.name}</button>}
                </div>
                <Select value={service.executed ? "executed" : "pending"} onValueChange={(value) => updateService(service.id, { executed: value === "executed" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="executed">Executado</SelectItem><SelectItem value="pending">Não Executado</SelectItem></SelectContent>
                </Select>
                <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm"><Checkbox checked={service.evidence} onCheckedChange={(checked) => updateService(service.id, { evidence: Boolean(checked) })} /> Evidência</label>
                <Input placeholder="Responsável" value={service.responsible} onChange={(event) => updateService(service.id, { responsible: event.target.value })} />
                <Textarea placeholder="Observações" value={service.notes} onChange={(event) => updateService(service.id, { notes: event.target.value })} className="min-h-10" />
                <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setEditing({ type: "service", id: service.id })} aria-label="Editar serviço"><Edit3 className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => removeService(service.id)} aria-label="Remover serviço"><Trash2 className="size-4 text-destructive" /></Button></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
