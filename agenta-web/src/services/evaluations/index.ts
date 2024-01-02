import axios from "@/lib//helpers/axiosConfig"
import {
    Annotation,
    AnnotationScenario,
    EvaluationStatus,
    Evaluator,
    EvaluatorConfig,
    TypedValue,
    _Evaluation,
    _EvaluationScenario,
} from "@/lib/Types"
import {getTagColors} from "@/lib/helpers/colors"
import {stringToNumberInRange} from "@/lib/helpers/utils"
import exactMatchImg from "@/media/target.png"
import similarityImg from "@/media/transparency.png"
import regexImg from "@/media/programming.png"
import webhookImg from "@/media/link.png"
import aiImg from "@/media/artificial-intelligence.png"
import codeImg from "@/media/browser.png"
import dayjs from "dayjs"
import {calcEvalDuration} from "@/components/pages/evaluations/evaluationResults/EvaluationResults"

//Prefix convention:
//  - fetch: GET single entity from server
//  - fetchAll: GET all entities from server
//  - create: POST data to server
//  - update: PUT data to server
//  - delete: DELETE data from server

const evaluatorIconsMap = {
    auto_exact_match: exactMatchImg,
    auto_similarity_match: similarityImg,
    auto_regex_test: regexImg,
    auto_webhook_test: webhookImg,
    auto_ai_critique: aiImg,
    auto_custom_code_run: codeImg,
}

//Evaluators
export const fetchAllEvaluators = async () => {
    const tagColors = getTagColors()

    const response = await axios.get(`/api/evaluators/`)
    return (response.data || [])
        .filter((item: Evaluator) => !item.key.startsWith("human"))
        .map((item: Evaluator) => ({
            ...item,
            icon_url: evaluatorIconsMap[item.key as keyof typeof evaluatorIconsMap],
            color: tagColors[stringToNumberInRange(item.key, 0, tagColors.length - 1)],
        })) as Evaluator[]
}

// Evaluator Configs
export const fetchAllEvaluatorConfigs = async (appId: string) => {
    const response = await axios.get(`/api/evaluators/configs/`, {params: {app_id: appId}})
    return response.data as EvaluatorConfig[]
}

export type CreateEvaluationConfigData = Omit<EvaluatorConfig, "id" | "created_at">
export const createEvaluatorConfig = async (appId: string, config: CreateEvaluationConfigData) => {
    return axios.post(`/api/evaluators/configs/`, {...config, app_id: appId})
}

export const updateEvaluatorConfig = async (
    configId: string,
    config: Partial<CreateEvaluationConfigData>,
) => {
    return axios.put(`/api/evaluators/configs/${configId}/`, config)
}

export const deleteEvaluatorConfig = async (configId: string) => {
    return axios.delete(`/api/evaluators/configs/${configId}/`)
}

// Evaluations
const evaluationTransformer = (item: any) => {
    const res = {
        id: item.id,
        appId: item.app_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        status: item.status,
        testset: {
            id: item.testset_id,
            name: item.testset_name,
        },
        user: {
            id: item.user_id,
            username: item.user_username,
        },
        variants: item.variant_ids.map((id: string, ix: number) => ({
            variantId: id,
            variantName: item.variant_names[ix],
        })),
        aggregated_results: item.aggregated_results || [],
    }

    ;(res as _Evaluation).duration = calcEvalDuration(res)
    return res
}

export const fetchAllEvaluations = async (appId: string) => {
    const response = await axios.get(`/api/evaluations/`, {params: {app_id: appId}})
    return response.data.map(evaluationTransformer) as _Evaluation[]
}

export const fetchEvaluation = async (evaluationId: string) => {
    const response = await axios.get(`/api/evaluations/${evaluationId}/`)
    return evaluationTransformer(response.data) as _Evaluation
}

export const fetchEvaluationStatus = async (evaluationId: string) => {
    const response = await axios.get(`/api/evaluations/${evaluationId}/status/`)
    return response.data as {status: EvaluationStatus}
}

export type CreateEvaluationData = {
    testset_id: string
    variant_ids: string[]
    evaluators_configs: string[]
}
export const createEvalutaiton = async (appId: string, evaluation: CreateEvaluationData) => {
    return axios.post(`/api/evaluations/`, {...evaluation, app_id: appId})
}

export const deleteEvaluations = async (evaluationsIds: string[]) => {
    return axios.delete(`/api/evaluations/`, {data: {evaluations_ids: evaluationsIds}})
}

// Evaluation Scenarios
export const fetchAllEvaluationScenarios = async (appId: string, evaluationId: string) => {
    const [{data: evaluationScenarios}, evaluation] = await Promise.all([
        axios.get(`/api/evaluations/${evaluationId}/evaluation_scenarios/`, {
            params: {app_id: appId},
        }),
        fetchEvaluation(evaluationId),
    ])

    evaluationScenarios.forEach((scenario: _EvaluationScenario) => {
        scenario.evaluation = evaluation
        scenario.evaluators_configs = evaluation.aggregated_results.map(
            (item) => item.evaluator_config,
        )
    })
    return evaluationScenarios as _EvaluationScenario[]
}

//annotations
export const fetchAllAnnotations = async (appId: string) => {
    const response = await axios.get(`/api/annotations/`, {params: {app_id: appId}})
    return response.data.map(evaluationTransformer) as Annotation[]
}

export const fetchAnnotation = async (annotationId: string) => {
    const response = await axios.get(`/api/annotations/${annotationId}/`)
    return evaluationTransformer(response.data) as unknown as Annotation
}

export const fetchAnnotationStatus = async (annotationId: string) => {
    const response = await axios.get(`/api/annotations/${annotationId}/status/`)
    return response.data as {status: EvaluationStatus}
}

export const createAnnotation = async (
    appId: string,
    annotation: Omit<CreateEvaluationData, "evaluators_configs"> &
        Pick<Annotation, "annotation_name">,
) => {
    return axios.post(`/api/annotations/`, {...annotation, app_id: appId})
}

export const deleteAnnotations = async (annotationsIds: string[]) => {
    return axios.delete(`/api/annotations/`, {data: {annotations_ids: annotationsIds}})
}

// Annotation Scenarios
export const fetchAllAnnotationScenarios = async (appId: string, annotationId: string) => {
    const [{data: annotationScenarios}, annotation] = await Promise.all([
        axios.get(`/api/annotations/${annotationId}/annotation_scenarios/`, {
            params: {app_id: appId},
        }),
        fetchAnnotation(annotationId),
    ])

    annotationScenarios.forEach((scenario: AnnotationScenario) => {
        scenario.annotation = annotation
    })
    return annotationScenarios as AnnotationScenario[]
}

export const updateAnnotationScenario = async (
    annotationId: string,
    annotationScenarioId: string,
    data: Pick<AnnotationScenario, "is_pinned" | "note" | "result">,
) => {
    return axios.put(
        `/api/annotations/${annotationId}/annotation_scenarios/${annotationScenarioId}`,
        data,
    )
}
