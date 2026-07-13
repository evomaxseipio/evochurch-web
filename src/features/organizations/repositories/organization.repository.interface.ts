import type {
  Organization,
  OrganizationCountFilters,
  OrganizationExistsCriteria,
  OrganizationInsert,
  OrganizationListParams,
  OrganizationPageResult,
  OrganizationSearchParams,
  OrganizationStatus,
  OrganizationUpdate,
  ChangeStageParams,
} from "../types";
import type { PipelineStage } from "../types/organization.enums";

export interface IOrganizationRepository {
  create(data: OrganizationInsert): Promise<Organization>;

  update(id: string, data: OrganizationUpdate): Promise<Organization>;

  archive(id: string): Promise<Organization>;

  findById(id: string): Promise<Organization | null>;

  findAll(params?: OrganizationListParams): Promise<OrganizationPageResult>;

  search(params: OrganizationSearchParams): Promise<OrganizationPageResult>;

  /**
   * Pipeline stage no vive en sales.organizations.
   * Reservado hasta sales.opportunities — lanza NOT_IMPLEMENTED.
   */
  changeStage(params: ChangeStageParams): Promise<Organization>;

  changeStatus(id: string, status: OrganizationStatus): Promise<Organization>;

  exists(criteria: OrganizationExistsCriteria): Promise<boolean>;

  count(filters?: OrganizationCountFilters): Promise<number>;
}

export type { PipelineStage, ChangeStageParams };
