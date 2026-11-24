import { Text, View } from 'react-native';
import { colors } from '../../config/theme';
import { Chip } from '../ui';

const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

const dayStart = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

// Күн жана саат тандоо (бүгүн / эртең / бүрсүгүнү + саат). value — ISO же undefined.
export function VisitPicker({ value, onChange, labels, dayLabel, timeLabel }: { value?: string; onChange: (iso?: string) => void; labels: [string, string, string]; dayLabel?: string; timeLabel?: string }) {
  const v = value ? new Date(value) : null;
  const dayIdx = v ? [0, 1, 2].find((o) => dayStart(o).toDateString() === v.toDateString()) : undefined;
  const time = v ? `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}` : undefined;
  const set = (o: number | undefined, tm: string | undefined) => {
    if (o === undefined) return onChange(undefined);
    const d = dayStart(o);
    const [h, m] = (tm ?? '10:00').split(':').map(Number);
    d.setHours(h, m, 0, 0);
    onChange(d.toISOString());
  };
  const now = new Date();
  return (
    <View style={{ gap: 8 }}>
      {!!dayLabel && <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>{dayLabel}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {labels.map((l, o) => (
          <Chip key={l} label={l} active={dayIdx === o} onPress={() => set(dayIdx === o ? undefined : o, time)} />
        ))}
      </View>
      {dayIdx !== undefined && (
        <>
          {!!timeLabel && <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>{timeLabel}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TIMES.filter((tm) => dayIdx > 0 || Number(tm.slice(0, 2)) > now.getHours()).map((tm) => (
              <Chip key={tm} label={tm} active={time === tm} onPress={() => set(dayIdx, tm)} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
