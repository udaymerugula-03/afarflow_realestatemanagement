import { useParams } from "react-router-dom";
import { WorkspaceShell, DashboardView } from "../components/workspace";
import { PropertyEditor, PropertyList } from "../components/property-manager";
import { LeadDetail, LeadList } from "../components/leads";
import { WorkflowView } from "../components/workflows";
import { StaffView } from "../components/staff";
import { Empty } from "../components/ui";
export default function WorkspacePage() {
  const { "*": path = "" } = useParams();
  const section = path.split("/").filter(Boolean);
  let content;
  if (!section.length) content = <DashboardView />;
  else if (section[0] === "properties" && section.length <= 2) content = section[1] ? <PropertyEditor id={section[1]} /> : <PropertyList />;
  else if (section[0] === "leads" && section.length <= 2) content = section[1] ? <LeadDetail id={section[1]} /> : <LeadList />;
  else if ((section[0] === "visits" || section[0] === "deals") && section.length === 1) content = <WorkflowView key={section[0]} kind={section[0]} />;
  else if (section[0] === "staff" && section.length === 1) content = <StaffView />;
  else content = <Empty title="This workspace page doesn’t exist">Use the navigation to get back on track.</Empty>;
  return <WorkspaceShell>{content}</WorkspaceShell>;
}
