export function studentData(joinedData, totalAssistance, totalParticipation, joinedRangeData){
    if (!joinedData || !Array.isArray(joinedData)) {
        return {
            dataBar2: {labels: [], datasets: [] },
            dataBar: { labels: [], datasets: [] },
            dataLineAssistance: { labels: [], datasets: [] },
            dataLineParticipation: { labels: [], datasets: [] },
        };
    }
    
    const labels = joinedData.map(student => `${student.FirstName} ${student.LastName}`);
    const participationCount = joinedData.map(student => student.ParticipationCount);
    const assistanceCount = joinedData.map(student => student.AssistanceCount);

    const dates = Object.keys(joinedRangeData);
    const assistanceDataByDate = dates.map(date => joinedRangeData[date].AssistanceCount);
    const participationDataByDate = dates.map(date => joinedRangeData[date].ParticipationCount);

    const lighterGreen = 'rgba(8, 144, 0, 0.7)';
    const lighterBlue = 'rgba(64, 149, 254, 0.7)';

    const dataTotal = {
        labels: ['Asistencia', 'Participación'],
        datasets: [
            {
                data: [totalAssistance, totalParticipation],
                backgroundColor: [lighterGreen, lighterBlue]

            },
        ],
        type: 'doughnut',
    };

    const dataBar = {
        labels: labels,
        datasets: [
            {
                label: 'Asistencia',
                data: assistanceCount,
                backgroundColor: lighterGreen,
            },
            {
                label: 'Participación',
                data: participationCount,
                backgroundColor: lighterBlue,
            },
        ],
    };

    const dataLineAssistance = {
        labels: dates,
        datasets: [
            {
                label: 'Asistencia',
                data: assistanceDataByDate,
                backgroundColor: lighterGreen,
            },
            {
                label: 'Participación',
                data: participationDataByDate,
                backgroundColor: lighterBlue,
            },
        ],
    };

    return {dataTotal, dataBar, dataLineAssistance};
}
